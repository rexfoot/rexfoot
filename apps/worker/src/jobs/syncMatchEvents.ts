import { prisma, type FixtureEventType, type Prisma } from "@rexfoot/db";
import {
  createHighlightlyClientIfConfigured,
  type HighlightlyClient,
  type HighlightlyEvent,
  type HighlightlyTeamLineup,
} from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";
import { notifyWriters } from "../lib/notifyWriters.js";
import { emitFixtureUpdate } from "../lib/realtime.js";

// Highlightly (plan gratuit) : 100 requêtes/jour, aucun plafond horaire strict
// documenté. Ce job tourne toutes les SYNC_INTERVAL_MINUTES (voir scheduler.ts).
// Régime de croisière par match et par cycle, une fois l'id Highlightly mis en
// cache sur Fixture : 2 requêtes (événements + statistiques, qui évoluent
// pendant le match) + 1 requête ponctuelle pour les compositions (jamais
// répétée — une composition ne change pas une fois le match commencé, seuls
// les remplacements sont suivis, déjà via les événements). Sert aussi de
// plafond pour la passe finale post-match (recentlyFinishedMatches) — les
// matchs LIVE/HALFTIME déjà résolus n'y sont eux plus soumis (voir plus bas).
const MAX_MATCHES_PER_RUN = 6;

// Bug réel constaté en prod (2026-09-05, journée à 12 matchs en direct
// simultanés, Manchester City-Coventry parmi les victimes) : les matchs pas
// encore résolus étaient plafonnés par MAX_MATCHES_PER_RUN et triés
// seulement par kickoffAt — un match à coup d'envoi plus tardif n'obtenait
// alors JAMAIS un créneau tant que ≥6 matchs plus tôt restaient en direct,
// pas juste ralenti mais ignoré pour toute la durée de sa rencontre. Ce
// plafond séparé et plus petit, combiné à un tri par tentative la plus
// ancienne (voir plus bas), fait tourner l'attention équitablement — les
// matchs déjà résolus, eux, ne sont plus plafonnés du tout (voir
// resolvedLiveMatches).
const MAX_LOOKUP_PER_RUN = 3;

// Bug réel constaté en prod (2026-09-05, journée à 11 matchs en direct
// simultanés) : sans cette limite, un match encore non résolu chez
// Highlightly déclenchait une recherche paginée (jusqu'à 3 requêtes, voir
// findMatchId dans highlightly.ts) à CHAQUE cycle de 10 minutes — le quota
// gratuit (100/jour) a été entièrement épuisé en un peu plus d'une heure,
// bloquant même les matchs déjà résolus (plus aucun but/minute mis à jour
// pour personne, cf. X-RateLimit-Requests-Remaining: 0 confirmé
// directement). On espace donc les tentatives de résolution : au plus une
// toutes les LOOKUP_RETRY_COOLDOWN_MS, qu'elle ait réussi ou non.
const LOOKUP_RETRY_COOLDOWN_MS = 30 * 60 * 1000;

// Un événement capté pendant un match LIVE peut être invalidé après coup (ex.
// but refusé par la VAR après le direct, comme Carlos Espí lors de Betis-Real
// Madrid du 04/09/2026 : toujours enregistré comme un vrai but chez nous,
// jamais corrigé car plus rien ne resynchronise un match déjà FINISHED).
// Même fenêtre que finalizeRecentMatches() dans syncLiveScores.ts, pour
// rester cohérent sur le delai de correction tardive plausible.
const FINAL_EVENTS_RECHECK_DELAY_MS = 105 * 60 * 1000;
const FINAL_EVENTS_RECHECK_WINDOW_MS = 4 * 60 * 60 * 1000;

const normalize = (s: string) => s.toLowerCase().trim();
function sameTeam(a: string, b: string): boolean {
  const [na, nb] = [normalize(a), normalize(b)];
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Best-effort : un type d'événement Highlightly non reconnu est ignoré (log
 * debug) plutôt que de faire échouer toute la synchro d'un match pour un seul
 * événement — voir aussi FixtureEventType (packages/db/prisma/schema.prisma).
 */
function mapEventType(rawType: string): FixtureEventType | null {
  const type = rawType.toLowerCase();
  // A verifier EN PREMIER : "VAR Goal Cancelled" contient "goal" et matchait
  // donc a tort la regle GOAL plus bas avant d'atteindre la regle VAR — bug
  // reel constate en prod (but de Carlos Espí, Betis-Real Madrid du
  // 04/09/2026, refuse par la VAR mais enregistre chez nous comme un vrai
  // but). Toute variante "but annule/refuse" doit rester un simple evenement
  // VAR, jamais un GOAL.
  if (type.includes("cancelled") || type.includes("canceled") || type.includes("disallowed") || type.includes("overturned")) {
    return "VAR";
  }
  if (type.includes("own goal")) return "OWN_GOAL";
  if (type.includes("missed penalty") || type.includes("penalty missed")) return "MISSED_PENALTY";
  if (type.includes("penalty")) return "PENALTY";
  if (type.includes("goal")) return "GOAL";
  if (type.includes("second yellow") || type.includes("red card")) return "RED_CARD";
  if (type.includes("yellow card")) return "YELLOW_CARD";
  if (type.includes("substitution")) return "SUBSTITUTION";
  if (type.includes("var")) return "VAR";
  return null;
}

/** "45+2" -> { minute: 45, extraMinute: 2 } ; "63" -> { minute: 63, extraMinute: null }. */
function parseMinute(time: string): { minute: number; extraMinute: number | null } {
  const [base, extra] = time.split("+");
  const minute = Number.parseInt(base ?? "", 10);
  const extraMinute = extra ? Number.parseInt(extra, 10) : null;
  return { minute: Number.isNaN(minute) ? 0 : minute, extraMinute: Number.isNaN(extraMinute!) ? null : extraMinute };
}

interface MatchTeams {
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
}

const GOAL_EVENT_TYPES: readonly FixtureEventType[] = ["GOAL", "OWN_GOAL", "PENALTY"];

/** Clé composite pour détecter un événement déjà connu (jamais un id stable côté Highlightly ici). */
function eventKey(type: string, minute: number, extraMinute: number | null, teamId: string, detail: string | null): string {
  return `${type}|${minute}|${extraMinute ?? ""}|${teamId}|${detail ?? ""}`;
}

/**
 * Remplace tous les événements connus du match par ceux renvoyés par
 * Highlightly (liste complète à jour à chaque appel, jamais un diff
 * incrémental — même stratégie que syncLiveScores.ts pour API-Football).
 * L'équipe est résolue par comparaison de nom (jamais d'id Highlightly côté
 * équipe stocké chez nous) ; le joueur n'est jamais résolu vers notre table
 * Player (aucune correspondance d'id fiable entre fournisseurs) — son nom est
 * stocké tel quel dans `detail` (buteur/sanctionné, ou joueur ENTRANT pour une
 * SUBSTITUTION) et `detailOut` (joueur SORTANT, uniquement pour une
 * SUBSTITUTION) — voir les badges d'événements sur MatchCard.tsx.
 *
 * Notifie aussi les rédacteurs (demandé par Hicham le 2026-09-05) pour tout
 * BUT réellement nouveau depuis le dernier cycle — jamais pour les autres
 * types (cartons/remplacements), ni renvoyé une deuxième fois pour un but
 * déjà notifié. Comme cette fonction efface puis recrée tous les événements
 * à chaque appel, on doit comparer contre l'ancien état AVANT de le
 * supprimer (une clé composite type/minute/équipe/joueur, faute d'id stable
 * côté Highlightly).
 */
async function replaceFixtureEvents(fixtureId: string, teams: MatchTeams, events: HighlightlyEvent[]): Promise<void> {
  const previousEvents = await prisma.fixtureEvent.findMany({
    where: { fixtureId },
    select: { type: true, minute: true, extraMinute: true, teamId: true, detail: true },
  });
  const previousKeys = new Set(
    previousEvents.map((e) => eventKey(e.type, e.minute, e.extraMinute, e.teamId, e.detail)),
  );
  // Premier import d'événements pour ce match (ex. highlightlyId tout juste
  // résolu, en retard sur un match déjà bien avancé) : tous les buts
  // paraîtraient "nouveaux" par rapport à un historique vide — on
  // n'envoie donc aucune notification ce cycle-là, seulement à partir du
  // suivant pour les vrais nouveaux buts.
  const isFirstImport = previousEvents.length === 0;

  await prisma.fixtureEvent.deleteMany({ where: { fixtureId } });

  for (const event of events) {
    const type = mapEventType(event.type);
    if (!type) {
      logger.debug({ fixtureId, rawType: event.type }, "Événement Highlightly ignoré (type non reconnu)");
      continue;
    }

    const teamId = sameTeam(event.team.name, teams.homeTeamName) ? teams.homeTeamId : teams.awayTeamId;
    const { minute, extraMinute } = parseMinute(event.time);

    if (
      !isFirstImport &&
      GOAL_EVENT_TYPES.includes(type) &&
      !previousKeys.has(eventKey(type, minute, extraMinute, teamId, event.player))
    ) {
      const teamName = teamId === teams.homeTeamId ? teams.homeTeamName : teams.awayTeamName;
      const minuteLabel = extraMinute ? `${minute}+${extraMinute}` : `${minute}`;
      void notifyWriters(
        `⚽ GOL de ${event.player ?? "?"} (${minuteLabel}') — ${teamName} | ${teams.homeTeamName} vs ${teams.awayTeamName}`,
      );
    }

    await prisma.fixtureEvent.create({
      data: {
        fixtureId,
        type,
        minute,
        extraMinute,
        teamId,
        detail: event.player,
        detailOut: type === "SUBSTITUTION" ? event.substituted : null,
      },
    });
  }
}

interface FlatLineupPlayer {
  name: string;
  number: number | null;
  position: string | null;
}

function flattenLineup(team: HighlightlyTeamLineup): FlatLineupPlayer[] {
  return team.initialLineup.flat().map((p) => ({ name: p.name, number: p.number, position: p.position }));
}

/** Une composition ne change jamais une fois le match commencé — jamais refetchée si déjà connue. */
async function syncLineupsIfMissing(
  client: HighlightlyClient,
  highlightlyId: number,
  fixtureId: string,
  teams: MatchTeams,
): Promise<void> {
  const already = await prisma.lineup.count({ where: { fixtureId } });
  if (already > 0) return;

  const lineups = await client.getLineups(highlightlyId);
  const sides: Array<[HighlightlyTeamLineup, string]> = [
    [lineups.homeTeam, teams.homeTeamId],
    [lineups.awayTeam, teams.awayTeamId],
  ];

  for (const [team, teamId] of sides) {
    await prisma.lineup.upsert({
      where: { fixtureId_teamId: { fixtureId, teamId } },
      create: {
        fixtureId,
        teamId,
        formation: team.formation,
        startingXI: flattenLineup(team) as unknown as Prisma.InputJsonValue,
        substitutes: team.substitutes as unknown as Prisma.InputJsonValue,
      },
      update: {
        formation: team.formation,
        startingXI: flattenLineup(team) as unknown as Prisma.InputJsonValue,
        substitutes: team.substitutes as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

/**
 * Table de correspondance nom Highlightly -> colonne TeamStatistics — voir
 * apps/worker/src/jobs/syncMatchEvents.ts (commentaire du modèle) pour
 * pourquoi seul un sous-ensemble des statistiques disponibles est retenu
 * (le reste — passes, duels, dribbles… — existe côté Highlightly mais n'a pas
 * encore de colonne ni d'affichage ici).
 */
function pickStat(stats: Array<{ value: number; displayName: string }>, displayName: string): number | null {
  return stats.find((s) => s.displayName === displayName)?.value ?? null;
}

async function syncStatistics(client: HighlightlyClient, highlightlyId: number, fixtureId: string, teams: MatchTeams): Promise<void> {
  const teamStats = await client.getStatistics(highlightlyId);

  for (const entry of teamStats) {
    const teamId = sameTeam(entry.team.name, teams.homeTeamName) ? teams.homeTeamId : teams.awayTeamId;
    const s = entry.statistics;
    const onTarget = pickStat(s, "Shots on target");
    const offTarget = pickStat(s, "Shots off target");
    const blocked = pickStat(s, "Blocked shots");
    const shotsTotal = onTarget !== null && offTarget !== null && blocked !== null ? onTarget + offTarget + blocked : null;

    // Highlightly renvoie la possession en fraction (0.53), pas en pourcentage
    // (53) — colonne TeamStatistics.possession en Int, donc conversion requise
    // ici avant stockage (sinon 0.53 tronqué silencieusement à 0 par Prisma).
    const possessionFraction = pickStat(s, "Possession");
    const possession = possessionFraction !== null ? Math.round(possessionFraction * 100) : null;

    const data = {
      possession,
      shotsTotal,
      shotsOnTarget: onTarget,
      corners: pickStat(s, "Corners"),
      fouls: pickStat(s, "Fouls"),
      offsides: pickStat(s, "Offsides"),
      yellowCards: pickStat(s, "Yellow cards"),
      redCards: pickStat(s, "Red cards"),
      expectedGoals: pickStat(s, "Expected Goals"),
      bigChancesCreated: pickStat(s, "Big Chances Created"),
    };

    await prisma.teamStatistics.upsert({
      where: { fixtureId_teamId: { fixtureId, teamId } },
      create: { fixtureId, teamId, ...data },
      update: data,
    });
  }
}

export async function syncMatchEvents(): Promise<void> {
  const client = createHighlightlyClientIfConfigured();
  if (!client) {
    logger.info("Aucune clé Highlightly configurée — syncMatchEvents ignoré (pas de fausse donnée générée)");
    return;
  }

  const matchSelect = {
    id: true,
    kickoffAt: true,
    highlightlyId: true,
    highlightlyLookupAttemptedAt: true,
    status: true,
    minute: true,
    homeTeam: { select: { id: true, name: true } },
    awayTeam: { select: { id: true, name: true } },
    competition: { select: { countryName: true } },
  } as const;

  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - LOOKUP_RETRY_COOLDOWN_MS);

  const [resolvedLiveMatches, unresolvedLiveMatches, recentlyFinishedMatches] = await Promise.all([
    // Déjà résolus : toujours tous traités (jamais plafonné par
    // MAX_MATCHES_PER_RUN) — un match déjà suivi ne doit plus jamais être
    // privé de son rafraîchissement events/stats au profit d'un nouveau
    // match, quel que soit le nombre de matchs en direct simultanés.
    prisma.fixture.findMany({
      where: { status: { in: ["LIVE", "HALFTIME"] }, highlightlyId: { not: null } },
      orderBy: { kickoffAt: "asc" },
      select: matchSelect,
    }),
    // Pas encore résolus : plafonné à MAX_LOOKUP_PER_RUN et priorisé par
    // tentative la plus ancienne (jamais tenté d'abord, "nulls first").
    // Bug réel constaté en prod (2026-09-05, journée à 12 matchs en direct) :
    // trié seulement par kickoffAt, les matchs à coup d'envoi plus tardif
    // (Manchester City, 14h) n'obtenaient JAMAIS un des MAX_MATCHES_PER_RUN
    // créneaux tant que ≥6 matchs à coup d'envoi plus tôt restaient en
    // direct — pas juste ralentis, complètement ignorés pour toute la durée
    // du match. Ce tri fait tourner l'attention équitablement.
    prisma.fixture.findMany({
      where: {
        status: { in: ["LIVE", "HALFTIME"] },
        highlightlyId: null,
        OR: [{ highlightlyLookupAttemptedAt: null }, { highlightlyLookupAttemptedAt: { lt: cooldownCutoff } }],
      },
      orderBy: [{ highlightlyLookupAttemptedAt: { sort: "asc", nulls: "first" } }, { kickoffAt: "asc" }],
      take: MAX_LOOKUP_PER_RUN,
      select: matchSelect,
    }),
    // Passe finale unique par match (voir finalEventsConfirmedAt) — jamais
    // rejouée indéfiniment, bornée à une fenêtre de quelques heures post-match.
    prisma.fixture.findMany({
      where: {
        status: "FINISHED",
        finalEventsConfirmedAt: null,
        highlightlyId: { not: null },
        kickoffAt: {
          lte: new Date(now.getTime() - FINAL_EVENTS_RECHECK_DELAY_MS),
          gte: new Date(now.getTime() - FINAL_EVENTS_RECHECK_WINDOW_MS),
        },
      },
      orderBy: { kickoffAt: "asc" },
      take: MAX_MATCHES_PER_RUN,
      select: matchSelect,
    }),
  ]);

  const matches = [
    ...resolvedLiveMatches.map((m) => ({ ...m, isFinalPass: false })),
    ...unresolvedLiveMatches.map((m) => ({ ...m, isFinalPass: false })),
    ...recentlyFinishedMatches.map((m) => ({ ...m, isFinalPass: true })),
  ];

  if (matches.length === 0) return;

  for (const match of matches) {
    try {
      let highlightlyId = match.highlightlyId;
      if (!highlightlyId) {
        const lastAttempt = match.highlightlyLookupAttemptedAt;
        if (lastAttempt && Date.now() - lastAttempt.getTime() < LOOKUP_RETRY_COOLDOWN_MS) {
          continue;
        }

        await prisma.fixture.update({ where: { id: match.id }, data: { highlightlyLookupAttemptedAt: new Date() } });
        highlightlyId = await client.findMatchId(
          match.homeTeam.name,
          match.awayTeam.name,
          match.kickoffAt.toISOString(),
          match.competition.countryName,
        );
        if (!highlightlyId) {
          logger.warn({ fixtureId: match.id, home: match.homeTeam.name, away: match.awayTeam.name }, "Match introuvable chez Highlightly, ignoré");
          continue;
        }
        await prisma.fixture.update({ where: { id: match.id }, data: { highlightlyId } });
      }

      const teams: MatchTeams = {
        homeTeamId: match.homeTeam.id,
        homeTeamName: match.homeTeam.name,
        awayTeamId: match.awayTeam.id,
        awayTeamName: match.awayTeam.name,
      };

      const events = await client.getEvents(highlightlyId);
      await replaceFixtureEvents(match.id, teams, events);
      logger.info(
        { fixtureId: match.id, events: events.length, finalPass: match.isFinalPass },
        "Événements de match synchronisés (Highlightly)",
      );
      emitFixtureUpdate(match.id);

      if (match.isFinalPass) {
        await prisma.fixture.update({ where: { id: match.id }, data: { finalEventsConfirmedAt: new Date() } });
      }

      // Chacun isolé dans son propre try/catch : un échec (quota épuisé en
      // cours de boucle, par ex.) ne doit priver le match ni des événements
      // déjà posés au-dessus, ni de l'autre appel restant.
      try {
        await syncLineupsIfMissing(client, highlightlyId, match.id, teams);
      } catch (cause) {
        logger.warn({ fixtureId: match.id, cause }, "Échec de synchro des compositions, ignoré");
      }
      try {
        await syncStatistics(client, highlightlyId, match.id, teams);
      } catch (cause) {
        logger.warn({ fixtureId: match.id, cause }, "Échec de synchro des statistiques, ignoré");
      }
      // Repli LIVE <-> HALFTIME + minute via Highlightly, jamais
      // SCHEDULED/FINISHED (ces transitions restent la responsabilité
      // exclusive de syncLiveScores.ts / finalizeRecentMatches — voir leur
      // commentaire). Bug réel constaté en prod (2026-09-05) : football-
      // data.org est resté bloqué sur IN_PLAY (même lastUpdated) plus de 6
      // minutes alors que le match était réellement au repos (confirmé ici
      // via Highlightly, description "Half time") — Hicham l'a vu en direct
      // sur mobile.
      //
      // Deuxième bug réel constaté en prod, le même jour, corrigé ici :
      // la première version de ce repli ne posait `minute` QUE pile au
      // moment du changement de statut (LIVE<->HALFTIME) — donc pendant tout
      // le reste d'une mi-temps (ex. de la 60e à la 74e minute), plus aucune
      // mise à jour n'arrivait, la minute affichée restant figée alors que
      // le match continuait (Hicham : "hemos quedado en el minuto 60 el
      // partido llego a 75"). `minute` doit se poser à CHAQUE cycle dès que
      // Highlightly le fournit, indépendamment de tout changement de statut.
      if (!match.isFinalPass) {
        try {
          const state = await client.getMatchState(highlightlyId);
          if (state) {
            const description = state.description.toLowerCase();
            const data: { status?: "HALFTIME" | "LIVE"; minute?: number } = {};

            if (description.includes("half time") && match.status !== "HALFTIME") {
              data.status = "HALFTIME";
            } else if (
              (description.includes("2nd half") || description.includes("second half")) &&
              match.status === "HALFTIME"
            ) {
              data.status = "LIVE";
            }
            if (state.clock !== null) {
              data.minute = state.clock;
            }

            if (Object.keys(data).length > 0) {
              await prisma.fixture.update({ where: { id: match.id }, data });
              emitFixtureUpdate(match.id);
              if (data.status) {
                logger.info({ fixtureId: match.id, status: data.status }, "Statut corrigé via Highlightly (football-data.org bloqué)");
              }
            }
          }
        } catch (cause) {
          logger.warn({ fixtureId: match.id, cause }, "Échec du repli d'état/minute via Highlightly, ignoré");
        }
      }
    } catch (cause) {
      // Une erreur sur un match (id introuvable, quota Highlightly épuisé pour
      // la journée, etc.) ne doit jamais bloquer les autres matchs en direct.
      logger.warn({ fixtureId: match.id, cause }, "Échec de synchro des événements pour ce match, ignoré");
    }
  }
}
