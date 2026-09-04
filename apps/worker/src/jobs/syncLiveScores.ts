import { prisma } from "@rexfoot/db";
import { hasAnyFootballProviderKey } from "@rexfoot/config";
import { createFootballProvider, getActiveProviderName, type FootballDataProvider } from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";

const PROVIDER_NAME = getActiveProviderName();

// Un match tout juste FINISHED n'a pas forcément un score définitif : constaté
// en prod, football-data.org a laissé Betis 1-1 Real Madrid pendant plus d'1h
// avant de corriger en 1-0 — score qu'on avait capturé au moment exact où le
// match passait FINISHED, et qu'on n'a plus jamais revérifié ensuite (rien ne
// touche un match déjà FINISHED). D'où cette seconde passe, une seule fois par
// match, dans la fenêtre où ce genre de correction tardive est plausible.
const FINAL_SCORE_RECHECK_DELAY_MS = 105 * 60 * 1000; // 1h45 apres le coup d'envoi : le match est presque certainement termine
const FINAL_SCORE_RECHECK_WINDOW_MS = 4 * 60 * 60 * 1000; // au-dela de 4h, on abandonne (evite de trainer de tres vieux matchs jamais confirmes)

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
  }
  return corrected;
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
    });
    if (!existing) {
      // Un match en direct qui n'a pas été vu par syncFixtures (ex. compétition
      // non-vedette) — on l'ignore plutôt que de créer une entrée sans
      // équipes/compétition correctement résolues.
      continue;
    }

    await prisma.fixture.update({
      where: { id: existing.id },
      data: {
        status: fixtureDto.status,
        minute: fixtureDto.minute,
        homeScore: fixtureDto.homeScore,
        awayScore: fixtureDto.awayScore,
      },
    });
  }

  // Un match qu'on avait en LIVE/HALFTIME mais qui n'apparaît plus dans le
  // scoreboard direct du fournisseur vient de se terminer (ou d'être
  // suspendu/reporté) — sans ce rattrapage, il reste bloqué en LIVE pour
  // toujours car il ne sera plus jamais renvoyé par getLiveScores(). On va
  // chercher son état final individuellement (peu de matchs concernés par
  // cycle, coût négligeable).
  const staleLive = await prisma.fixture.findMany({
    where: { provider: PROVIDER_NAME, status: { in: ["LIVE", "HALFTIME"] } },
  });
  for (const fixture of staleLive) {
    if (liveExternalIds.has(fixture.externalId)) continue;
    const detail = await provider.getFixtureDetail(fixture.externalId);
    if (!detail) continue;
    await prisma.fixture.update({
      where: { id: fixture.id },
      data: {
        status: detail.status,
        minute: detail.minute,
        homeScore: detail.homeScore,
        awayScore: detail.awayScore,
      },
    });
  }

  const corrected = await finalizeRecentMatches(provider);

  logger.info(
    { count: liveFixtures.length, resolved: staleLive.length, finalScoreCorrections: corrected },
    "Scores en direct synchronisés",
  );
  return liveFixtures.length > 0;
}
