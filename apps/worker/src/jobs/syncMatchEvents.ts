import { prisma, type FixtureEventType, type Prisma } from "@rexfoot/db";
import {
  createHighlightlyClientIfConfigured,
  type HighlightlyClient,
  type HighlightlyEvent,
  type HighlightlyTeamLineup,
} from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";

// Highlightly (plan gratuit) : 100 requêtes/jour, aucun plafond horaire strict
// documenté. Ce job tourne toutes les SYNC_INTERVAL_MINUTES (voir scheduler.ts)
// et ne traite au plus MAX_MATCHES_PER_RUN matchs en direct par exécution.
// Régime de croisière par match et par cycle, une fois l'id Highlightly mis en
// cache sur Fixture : 2 requêtes (événements + statistiques, qui évoluent
// pendant le match) + 1 requête ponctuelle pour les compositions (jamais
// répétée — une composition ne change pas une fois le match commencé, seuls
// les remplacements sont suivis, déjà via les événements).
const MAX_MATCHES_PER_RUN = 6;

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
 */
async function replaceFixtureEvents(fixtureId: string, teams: MatchTeams, events: HighlightlyEvent[]): Promise<void> {
  await prisma.fixtureEvent.deleteMany({ where: { fixtureId } });

  for (const event of events) {
    const type = mapEventType(event.type);
    if (!type) {
      logger.debug({ fixtureId, rawType: event.type }, "Événement Highlightly ignoré (type non reconnu)");
      continue;
    }

    const teamId = sameTeam(event.team.name, teams.homeTeamName) ? teams.homeTeamId : teams.awayTeamId;
    const { minute, extraMinute } = parseMinute(event.time);

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
    homeTeam: { select: { id: true, name: true } },
    awayTeam: { select: { id: true, name: true } },
    competition: { select: { countryName: true } },
  } as const;

  const now = new Date();
  const [liveMatches, recentlyFinishedMatches] = await Promise.all([
    prisma.fixture.findMany({
      where: { status: { in: ["LIVE", "HALFTIME"] } },
      orderBy: { kickoffAt: "asc" },
      take: MAX_MATCHES_PER_RUN,
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
    ...liveMatches.map((m) => ({ ...m, isFinalPass: false })),
    ...recentlyFinishedMatches.map((m) => ({ ...m, isFinalPass: true })),
  ];

  if (matches.length === 0) return;

  for (const match of matches) {
    try {
      let highlightlyId = match.highlightlyId;
      if (!highlightlyId) {
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
    } catch (cause) {
      // Une erreur sur un match (id introuvable, quota Highlightly épuisé pour
      // la journée, etc.) ne doit jamais bloquer les autres matchs en direct.
      logger.warn({ fixtureId: match.id, cause }, "Échec de synchro des événements pour ce match, ignoré");
    }
  }
}
