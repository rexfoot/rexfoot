import { prisma } from "@rexfoot/db";
import { hasAnyFootballProviderKey } from "@rexfoot/config";
import { createFootballProvider, getActiveProviderName, type FootballDataProvider } from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";
import { notifyWriters } from "../lib/notifyWriters.js";
import { emitFixtureUpdate } from "../lib/realtime.js";

const PROVIDER_NAME = getActiveProviderName();

// Un match tout juste FINISHED n'a pas forcément un score définitif : constaté
// en prod, football-data.org a laissé Betis 1-1 Real Madrid pendant plus d'1h
// avant de corriger en 1-0 — score qu'on avait capturé au moment exact où le
// match passait FINISHED, et qu'on n'a plus jamais revérifié ensuite (rien ne
// touche un match déjà FINISHED). D'où cette seconde passe, une seule fois par
// match, dans la fenêtre où ce genre de correction tardive est plausible.
const FINAL_SCORE_RECHECK_DELAY_MS = 105 * 60 * 1000; // 1h45 apres le coup d'envoi : le match est presque certainement termine
const FINAL_SCORE_RECHECK_WINDOW_MS = 4 * 60 * 60 * 1000; // au-dela de 4h, on abandonne (evite de trainer de tres vieux matchs jamais confirmes)

// Bug réel constaté en prod (2026-09-05) : Manchester City-Coventry (ligue,
// donc jamais de prolongation possible) restait affiché EN DIRECT bien après
// sa fin réelle — vérifié directement : football-data.org lui-même
// renvoyait IN_PLAY avec un lastUpdated identique à plusieurs requêtes
// espacées de plus d'une minute, un vrai blocage chez EUX (le fournisseur
// entier, pas seulement l'endpoint "detail" déjà connu pour ce défaut).
// staleLive plus bas ne corrige que si le match a DISPARU de leur liste
// "LIVE" — inutile si LEUR liste elle-même reste bloquée à le dire vivant.
// Ce filet de sécurité force donc FINISHED (score connu conservé, best-
// effort) passé un délai que même un match à prolongations + tirs au but ne
// devrait jamais dépasser — jamais pour un simple retard, uniquement pour un
// blocage manifestement anormal des DEUX fournisseurs à la fois.
const MAX_LEAGUE_MATCH_DURATION_MS = 125 * 60 * 1000; // 2h05 : championnat, jamais de prolongation
const MAX_CUP_MATCH_DURATION_MS = 175 * 60 * 1000; // 2h55 : coupe, prolongations + tirs au but possibles

/**
 * Revérifie une seule fois (finalScoreConfirmedAt) le score des matchs
 * fraîchement FINISHED, pour rattraper une correction tardive du fournisseur.
 * Peu coûteux : au plus une poignée de matchs concernés par jour.
 */
async function finalizeRecentMatches(provider: FootballDataProvider): Promise<number> {
  const now = new Date();
  const recentlyFinished = await prisma.fixture.findMany({
    where: {
      provider: PROVIDER_NAME,
      status: "FINISHED",
      finalScoreConfirmedAt: null,
      kickoffAt: {
        lte: new Date(now.getTime() - FINAL_SCORE_RECHECK_DELAY_MS),
        gte: new Date(now.getTime() - FINAL_SCORE_RECHECK_WINDOW_MS),
      },
    },
  });

  let corrected = 0;
  for (const fixture of recentlyFinished) {
    const detail = await provider.getFixtureDetail(fixture.externalId);
    if (!detail) continue;

    if (detail.homeScore !== fixture.homeScore || detail.awayScore !== fixture.awayScore) {
      corrected += 1;
      logger.warn(
        {
          fixtureId: fixture.id,
          before: `${fixture.homeScore}-${fixture.awayScore}`,
          after: `${detail.homeScore}-${detail.awayScore}`,
        },
        "Score final corrige par le fournisseur apres coup",
      );
    }

    await prisma.fixture.update({
      where: { id: fixture.id },
      data: {
        status: detail.status,
        minute: detail.minute,
        homeScore: detail.homeScore,
        awayScore: detail.awayScore,
        finalScoreConfirmedAt: now,
      },
    });
    emitFixtureUpdate(fixture.id);
  }
  return corrected;
}

/**
 * Filet de sécurité final : un match encore LIVE/HALFTIME largement au-delà
 * de toute durée plausible passe FINISHED de force (score déjà connu
 * conservé tel quel), indépendamment de ce que dit le fournisseur — voir le
 * commentaire de MAX_LEAGUE_MATCH_DURATION_MS ci-dessus pour l'incident qui
 * a motivé ce garde-fou. Coût négligeable : quasiment jamais déclenché en
 * fonctionnement normal (le staleLive plus haut résout déjà l'immense
 * majorité des cas), aucun appel réseau nécessaire.
 */
async function forceFinishStuckMatches(): Promise<number> {
  const now = Date.now();
  const stuck = await prisma.fixture.findMany({
    where: { provider: PROVIDER_NAME, status: { in: ["LIVE", "HALFTIME"] } },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      competition: { select: { type: true } },
    },
  });

  let forced = 0;
  for (const fixture of stuck) {
    const maxDurationMs =
      fixture.competition.type === "CUP" ? MAX_CUP_MATCH_DURATION_MS : MAX_LEAGUE_MATCH_DURATION_MS;
    if (now - fixture.kickoffAt.getTime() < maxDurationMs) continue;

    logger.warn(
      {
        fixtureId: fixture.id,
        home: fixture.homeTeam.name,
        away: fixture.awayTeam.name,
        kickoffAt: fixture.kickoffAt,
        score: `${fixture.homeScore}-${fixture.awayScore}`,
      },
      "Match resté LIVE/HALFTIME au-delà de toute durée plausible — forcé FINISHED (blocage fournisseur)",
    );
    await prisma.fixture.update({ where: { id: fixture.id }, data: { status: "FINISHED" } });
    emitFixtureUpdate(fixture.id);
    void notifyWriters(
      `🏁 Final: ${fixture.homeTeam.name} ${fixture.homeScore ?? "?"}-${fixture.awayScore ?? "?"} ${fixture.awayTeam.name}`,
    );
    forced += 1;
  }
  return forced;
}

/**
 * Rafraîchit score/minute/statut des matchs actuellement en direct. Conçu
 * pour tourner très fréquemment (toutes les 15-30s) pendant les fenêtres de
 * matchs — voir scheduler.ts pour la cadence dynamique.
 *
 * Ne touche plus aux événements (buts/cartons/remplacements) : le fournisseur
 * actif (football-data.org) ne les expose jamais sur le plan gratuit
 * (getFixtureDetail().events reste toujours []) — les appeler ici ne faisait
 * qu'écraser silencieusement, à chaque cycle, les vrais événements posés par
 * syncMatchEvents.ts (Highlightly). Voir ce fichier pour la source réelle.
 */
/** Renvoie `true` si des matchs étaient en direct — pilote la cadence de replanification (voir scheduler.ts). */
export async function syncLiveScores(): Promise<boolean> {
  if (!hasAnyFootballProviderKey()) {
    logger.info("Aucune clé de fournisseur football — syncLiveScores ignoré (aucune fausse donnée générée)");
    return false;
  }

  const provider = createFootballProvider();
  const liveFixtures = await provider.getLiveScores();
  const liveExternalIds = new Set(liveFixtures.map((f) => f.externalId));

  for (const fixtureDto of liveFixtures) {
    const existing = await prisma.fixture.findUnique({
      where: { provider_externalId: { provider: PROVIDER_NAME, externalId: fixtureDto.externalId } },
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    });
    if (!existing) {
      // Un match en direct qui n'a pas été vu par syncFixtures (ex. compétition
      // non-vedette) — on l'ignore plutôt que de créer une entrée sans
      // équipes/compétition correctement résolues.
      continue;
    }

    // Notification "coup d'envoi" aux rédacteurs (demandé par Hicham le
    // 2026-09-05) : uniquement sur la transition SCHEDULED -> LIVE/HALFTIME,
    // jamais renvoyée ensuite (chaque cycle ultérieur ne fait que rafraîchir
    // un match déjà en direct).
    if (existing.status === "SCHEDULED") {
      void notifyWriters(`⚽ ¡Comenzó! ${existing.homeTeam.name} vs ${existing.awayTeam.name}`);
    }

    // Bug réel constaté en prod (2026-09-05) : le statut affiché oscillait
    // (37' -> mi-temps -> 51' -> 37' -> mi-temps...) pendant plusieurs
    // minutes sur Newcastle-Bournemouth. Cause : ce job (toutes les 45s)
    // écrasait sans condition le statut/la minute avec la lecture de
    // football-data.org — qui reste "IN_PLAY" (-> LIVE) même pendant la
    // vraie mi-temps le temps qu'ils la détectent chez eux — juste après que
    // le repli Highlightly (syncMatchEvents.ts, voir ce fichier) venait de
    // corriger en HALFTIME. Les deux jobs se disputaient le même champ sans
    // se coordonner. Une fois le match démarré (donc plus SCHEDULED), seul
    // ce job peut encore faire avancer le statut jusqu'à FINISHED (voir
    // staleLive plus bas) — la nuance LIVE <-> HALFTIME appartient
    // désormais EXCLUSIVEMENT au repli Highlightly, qui a l'information
    // fiable (son horloge ne dépend pas de football-data.org). Même
    // principe pour `minute` : football-data.org ne le renseigne quasiment
    // jamais sur ce plan (toujours `null` ici) — l'omettre plutôt que
    // d'écraser la vraie minute que Highlightly vient de poser.
    await prisma.fixture.update({
      where: { id: existing.id },
      data: {
        status: existing.status === "SCHEDULED" ? fixtureDto.status : undefined,
        ...(fixtureDto.minute !== null ? { minute: fixtureDto.minute } : {}),
        homeScore: fixtureDto.homeScore,
        awayScore: fixtureDto.awayScore,
      },
    });
    emitFixtureUpdate(existing.id);
  }

  // Un match qu'on avait en LIVE/HALFTIME mais qui n'apparaît plus dans le
  // scoreboard direct du fournisseur vient de se terminer (ou d'être
  // suspendu/reporté) — sans ce rattrapage, il reste bloqué en LIVE pour
  // toujours car il ne sera plus jamais renvoyé par getLiveScores(). On va
  // chercher son état final individuellement (peu de matchs concernés par
  // cycle, coût négligeable).
  //
  // Bug réel constaté en prod (2026-09-05) : l'endpoint /matches/{id} du
  // fournisseur peut lui-même renvoyer un état incohérent avec sa propre
  // liste "LIVE" quelques secondes plus tôt (confirmé manuellement : un
  // même match, deux requêtes à 24s d'écart, IN_PLAY 0-1 puis TIMED
  // null-null). Un match déjà LIVE/HALFTIME ne peut chronologiquement
  // jamais redevenir SCHEDULED — si ce fallback renvoie ça, on l'ignore
  // plutôt que d'écraser un vrai direct avec une lecture manifestement
  // fausse (même risque que le bug syncFixtures corrigé plus tôt le
  // même jour, mais ici côté syncLiveScores lui-même).
  const staleLive = await prisma.fixture.findMany({
    where: { provider: PROVIDER_NAME, status: { in: ["LIVE", "HALFTIME"] } },
    include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
  });
  for (const fixture of staleLive) {
    if (liveExternalIds.has(fixture.externalId)) continue;
    const detail = await provider.getFixtureDetail(fixture.externalId);
    if (!detail) continue;
    if (detail.status === "SCHEDULED") {
      logger.warn(
        { fixtureId: fixture.id, externalId: fixture.externalId },
        "Le fournisseur a renvoyé SCHEDULED pour un match déjà LIVE — lecture ignorée (incohérence connue du fournisseur)",
      );
      continue;
    }

    // Notification "fin du match" aux rédacteurs (demandé par Hicham le
    // 2026-09-05) : uniquement au moment précis où le match bascule en
    // FINISHED, jamais renvoyée (finalizeRecentMatches touche ce fixture
    // ensuite mais son statut reste FINISHED, donc cette condition ne
    // redevient jamais vraie).
    if (detail.status === "FINISHED") {
      void notifyWriters(
        `🏁 Final: ${fixture.homeTeam.name} ${detail.homeScore ?? "?"}-${detail.awayScore ?? "?"} ${fixture.awayTeam.name}`,
      );
    }

    await prisma.fixture.update({
      where: { id: fixture.id },
      data: {
        status: detail.status,
        ...(detail.minute !== null ? { minute: detail.minute } : {}),
        homeScore: detail.homeScore,
        awayScore: detail.awayScore,
      },
    });
    emitFixtureUpdate(fixture.id);
  }

  const corrected = await finalizeRecentMatches(provider);
  const forcedFinished = await forceFinishStuckMatches();

  // Piloté par notre propre état en base plutôt que par liveFixtures.length :
  // bug réel constaté en prod, la liste LIVE du fournisseur peut renvoyer 0
  // matchs de façon transitoire (vu dans les logs : count:0 en plein milieu
  // d'un match confirmé en direct par ailleurs) alors qu'un vrai match est en
  // cours — se fier uniquement à cette lecture faisait basculer la cadence
  // sur l'intervalle idle (3 min) pile au moment où un but pouvait se
  // marquer. Notre table Fixture, elle, ne redescend de LIVE/HALFTIME que sur
  // une confirmation ferme (terminé/reporté/annulé, jamais SCHEDULED, voir
  // le garde-fou juste au-dessus), donc plus fiable comme signal de cadence.
  const stillLiveCount = await prisma.fixture.count({
    where: { provider: PROVIDER_NAME, status: { in: ["LIVE", "HALFTIME"] } },
  });

  // Bug régulièrement signalé par Hicham à chaque nouvelle journée de matchs
  // ("les matchs ont commencé et RexFoot n'affiche rien") : un match dont le
  // coup d'envoi réel est déjà passé reste SCHEDULED chez nous jusqu'à ce que
  // getLiveScores() le confirme LIVE — et tant que stillLiveCount reste à 0,
  // la cadence retombe sur l'intervalle idle (3 min, voir scheduler.ts), donc
  // jusqu'à 3 min d'affichage "à venir" après un coup d'envoi déjà visible
  // ailleurs (Sofascore). Ce signal force la cadence rapide dès que le coup
  // d'envoi est passé, sans attendre la confirmation LIVE. Borné à
  // MAX_CUP_MATCH_DURATION_MS pour ignorer un match reporté dont le
  // kickoffAt n'a jamais été mis à jour (sinon cadence rapide indéfiniment).
  const kickoffPending = await prisma.fixture.count({
    where: {
      provider: PROVIDER_NAME,
      status: "SCHEDULED",
      kickoffAt: { lte: new Date(), gte: new Date(Date.now() - MAX_CUP_MATCH_DURATION_MS) },
    },
  });

  logger.info(
    { count: liveFixtures.length, resolved: staleLive.length, finalScoreCorrections: corrected, forcedFinished, stillLiveCount, kickoffPending },
    "Scores en direct synchronisés",
  );
  return stillLiveCount > 0 || kickoffPending > 0;
}
