import { prisma } from "@rexfoot/db";
import { hasAnyFootballProviderKey } from "@rexfoot/config";
import { createFootballProvider, getActiveProviderName, type FixtureEventDTO } from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";

const PROVIDER_NAME = getActiveProviderName();

/**
 * Rafraîchit score/minute/statut des matchs actuellement en direct, et
 * resynchronise leurs événements (buts, cartons, remplacements). Conçu pour
 * tourner très fréquemment (toutes les 15-30s) pendant les fenêtres de
 * matchs — voir scheduler.ts pour la cadence dynamique.
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

    const detail = await provider.getFixtureDetail(fixtureDto.externalId);
    if (!detail) continue;

    await syncFixtureEvents(existing.id, detail.events);
  }

  logger.info({ count: liveFixtures.length }, "Scores en direct synchronisés");
  return true;
}

async function syncFixtureEvents(fixtureId: string, events: FixtureEventDTO[]): Promise<void> {
  const teamCache = new Map<string, string>();
  const playerCache = new Map<string, string>();

  async function resolveTeamId(externalId: string): Promise<string | null> {
    if (teamCache.has(externalId)) return teamCache.get(externalId)!;
    const team = await prisma.team.findUnique({
      where: { provider_externalId: { provider: PROVIDER_NAME, externalId } },
      select: { id: true },
    });
    if (team) teamCache.set(externalId, team.id);
    return team?.id ?? null;
  }

  async function resolvePlayerId(externalId: string | null): Promise<string | null> {
    if (!externalId) return null;
    if (playerCache.has(externalId)) return playerCache.get(externalId)!;
    const player = await prisma.player.findUnique({
      where: { provider_externalId: { provider: PROVIDER_NAME, externalId } },
      select: { id: true },
    });
    if (player) playerCache.set(externalId, player.id);
    return player?.id ?? null;
  }

  // Stratégie simple : on remplace tous les événements connus du match à
  // chaque sync (le fournisseur renvoie la liste complète à jour à chaque
  // appel), plutôt que de tenter un diff événement par événement.
  await prisma.fixtureEvent.deleteMany({ where: { fixtureId } });

  for (const event of events) {
    const teamId = await resolveTeamId(event.teamExternalId);
    if (!teamId) continue;

    await prisma.fixtureEvent.create({
      data: {
        fixtureId,
        type: event.type,
        minute: event.minute,
        extraMinute: event.extraMinute,
        teamId,
        playerId: await resolvePlayerId(event.playerExternalId),
        assistPlayerId: await resolvePlayerId(event.assistPlayerExternalId),
        relatedPlayerId: await resolvePlayerId(event.relatedPlayerExternalId),
        detail: event.detail,
      },
    });
  }
}
