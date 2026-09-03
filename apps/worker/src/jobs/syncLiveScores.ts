import { prisma } from "@rexfoot/db";
import { hasAnyFootballProviderKey } from "@rexfoot/config";
import { createFootballProvider, getActiveProviderName } from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";

const PROVIDER_NAME = getActiveProviderName();

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

  if (liveFixtures.length === 0) {
    return false;
  }

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

  logger.info({ count: liveFixtures.length }, "Scores en direct synchronisés");
  return true;
}
