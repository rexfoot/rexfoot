import { prisma } from "@rexfoot/db";
import { hasFootballApiKey } from "@rexfoot/config";
import { createFootballProvider } from "@rexfoot/football-provider";
import { findPlayerByExternalId } from "../lib/upsert.js";
import { logger } from "../lib/logger.js";

const LOOKBACK_HOURS = 48;

/**
 * Pour les matchs terminés récemment, récupère les statistiques équipe et
 * joueur. Volontairement limité à une fenêtre glissante (dernières 48h) pour
 * ne pas re-parcourir tout l'historique à chaque exécution.
 */
export async function syncPlayerStats(): Promise<void> {
  if (!hasFootballApiKey()) {
    logger.info("RAPIDAPI_KEY absent — syncPlayerStats ignoré (aucune fausse donnée générée)");
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

      const members = await prisma.playerTeamMembership.findMany({
        where: { teamId: team.id, seasonId: fixture.seasonId },
        select: { playerId: true, player: { select: { externalId: true } } },
      });

      for (const member of members) {
        const playerStats = await provider.getPlayerStatistics({
          playerExternalId: member.player.externalId,
          seasonExternalId: fixture.season.externalId,
        });
        const statForTeam = playerStats.find((s) => s.teamExternalId === team.externalId);
        if (!statForTeam) continue;

        const player = await findPlayerByExternalId(member.player.externalId);
        if (!player) continue;

        await prisma.playerStatistics.upsert({
          where: { fixtureId_playerId: { fixtureId: fixture.id, playerId: player.id } },
          create: {
            fixtureId: fixture.id,
            playerId: player.id,
            teamId: team.id,
            minutesPlayed: statForTeam.minutesPlayed,
            goals: statForTeam.goals,
            assists: statForTeam.assists,
            shots: statForTeam.shots,
            shotsOnTarget: statForTeam.shotsOnTarget,
            passes: statForTeam.passes,
            passAccuracy: statForTeam.passAccuracy,
            tackles: statForTeam.tackles,
            rating: statForTeam.rating,
            yellowCards: statForTeam.yellowCards,
            redCards: statForTeam.redCards,
          },
          update: {
            minutesPlayed: statForTeam.minutesPlayed,
            goals: statForTeam.goals,
            assists: statForTeam.assists,
            shots: statForTeam.shots,
            shotsOnTarget: statForTeam.shotsOnTarget,
            passes: statForTeam.passes,
            passAccuracy: statForTeam.passAccuracy,
            tackles: statForTeam.tackles,
            rating: statForTeam.rating,
            yellowCards: statForTeam.yellowCards,
            redCards: statForTeam.redCards,
          },
        });
      }
    }
  }

  logger.info({ fixtures: recentlyFinished.length }, "Statistiques post-match synchronisées");
}
