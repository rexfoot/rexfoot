import { prisma } from "@rexfoot/db";
import { hasAnyFootballProviderKey } from "@rexfoot/config";
import { createFootballProvider } from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";

const LOOKBACK_HOURS = 48;

/**
 * Pour les matchs terminés récemment, récupère les statistiques d'équipe
 * (2 appels par match : domicile + extérieur). Volontairement limité à une
 * fenêtre glissante (dernières 48h). Les statistiques par joueur ne sont PAS
 * synchronisées ici : un appel getPlayerStatistics par membre d'effectif
 * exploserait le quota d'un plan gratuit.
 *
 * Avec football-data.org (fournisseur actif par défaut), getTeamStatistics
 * renvoie toujours `null` — ce plan n'expose pas ces données. Le job continue
 * de tourner sans erreur (juste sans effet), plutôt que d'ajouter une
 * détection de capacité par fournisseur pour ce cas mineur.
 */
export async function syncPlayerStats(): Promise<void> {
  if (!hasAnyFootballProviderKey()) {
    logger.info("Aucune clé de fournisseur football — syncPlayerStats ignoré (aucune fausse donnée générée)");
    return;
  }

  const provider = createFootballProvider();
  const since = new Date();
  since.setHours(since.getHours() - LOOKBACK_HOURS);

  const recentlyFinished = await prisma.fixture.findMany({
    where: { status: "FINISHED", kickoffAt: { gte: since } },
    include: { homeTeam: true, awayTeam: true, competition: true, season: true },
  });

  for (const fixture of recentlyFinished) {
    for (const team of [fixture.homeTeam, fixture.awayTeam]) {
      const teamStats = await provider.getTeamStatistics({
        teamExternalId: team.externalId,
        competitionExternalId: fixture.competition.externalId,
        seasonExternalId: fixture.season.externalId,
      });
      if (teamStats) {
        await prisma.teamStatistics.upsert({
          where: { fixtureId_teamId: { fixtureId: fixture.id, teamId: team.id } },
          create: {
            fixtureId: fixture.id,
            teamId: team.id,
            possession: teamStats.possession,
            shotsTotal: teamStats.shotsTotal,
            shotsOnTarget: teamStats.shotsOnTarget,
            corners: teamStats.corners,
            fouls: teamStats.fouls,
            offsides: teamStats.offsides,
            yellowCards: teamStats.yellowCards,
            redCards: teamStats.redCards,
          },
          update: {
            possession: teamStats.possession,
            shotsTotal: teamStats.shotsTotal,
            shotsOnTarget: teamStats.shotsOnTarget,
            corners: teamStats.corners,
            fouls: teamStats.fouls,
            offsides: teamStats.offsides,
            yellowCards: teamStats.yellowCards,
            redCards: teamStats.redCards,
          },
        });
      }
    }
  }

  logger.info({ fixtures: recentlyFinished.length }, "Statistiques post-match synchronisées");
}
