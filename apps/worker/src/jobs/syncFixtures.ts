import { prisma } from "@rexfoot/db";
import { hasFootballApiKey } from "@rexfoot/config";
import { createFootballProvider } from "@rexfoot/football-provider";
import { resolveFeaturedCompetitions } from "../lib/competitions.js";
import { upsertPlayer, upsertSeason, upsertTeam } from "../lib/upsert.js";
import { logger } from "../lib/logger.js";

const WINDOW_DAYS_PAST = 3;
const WINDOW_DAYS_FUTURE = 14;

/**
 * Synchronise, pour chaque compétition vedette : la saison courante, les
 * équipes + effectifs, puis les matchs de la fenêtre [-3j, +14j]. C'est le
 * job qui pose les fondations (équipes/joueurs) dont dépendent les autres
 * jobs (syncLiveScores, syncStandings, syncPlayerStats).
 */
export async function syncFixtures(): Promise<void> {
  if (!hasFootballApiKey()) {
    logger.info("RAPIDAPI_KEY absent — syncFixtures ignoré (aucune fausse donnée générée)");
    return;
  }

  const provider = createFootballProvider();
  const featured = await resolveFeaturedCompetitions(provider);

  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - WINDOW_DAYS_PAST);
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + WINDOW_DAYS_FUTURE);

  for (const { competition, externalId: competitionExternalId } of featured) {
    const seasons = await provider.getSeasons(competitionExternalId);
    const currentSeasonDto = seasons.find((s) => s.isCurrent) ?? seasons.at(-1);
    if (!currentSeasonDto) {
      logger.warn({ competition: competition.name }, "Aucune saison trouvée, compétition ignorée");
      continue;
    }
    const season = await upsertSeason(currentSeasonDto, competition.id);

    const teams = await provider.getTeams({
      competitionExternalId,
      seasonExternalId: currentSeasonDto.externalId,
    });
    const teamRowByExternalId = new Map<string, Awaited<ReturnType<typeof upsertTeam>>>();
    for (const teamDto of teams) {
      const team = await upsertTeam(teamDto);
      teamRowByExternalId.set(teamDto.externalId, team);

      await prisma.teamCompetitionSeason.upsert({
        where: {
          teamId_competitionId_seasonId: {
            teamId: team.id,
            competitionId: competition.id,
            seasonId: season.id,
          },
        },
        create: { teamId: team.id, competitionId: competition.id, seasonId: season.id },
        update: {},
      });

      const players = await provider.getPlayers({
        teamExternalId: teamDto.externalId,
        seasonExternalId: currentSeasonDto.externalId,
      });
      for (const playerDto of players) {
        const player = await upsertPlayer(playerDto);
        await prisma.playerTeamMembership.upsert({
          where: {
            playerId_teamId_seasonId: { playerId: player.id, teamId: team.id, seasonId: season.id },
          },
          create: {
            playerId: player.id,
            teamId: team.id,
            seasonId: season.id,
            shirtNumber: playerDto.shirtNumber,
          },
          update: { shirtNumber: playerDto.shirtNumber },
        });
      }
    }

    const fixtures = await provider.getFixtures({
      competitionExternalId,
      dateFrom,
      dateTo,
    });

    for (const fixtureDto of fixtures) {
      const homeTeam = teamRowByExternalId.get(fixtureDto.homeTeamExternalId);
      const awayTeam = teamRowByExternalId.get(fixtureDto.awayTeamExternalId);
      if (!homeTeam || !awayTeam) {
        logger.warn(
          { fixture: fixtureDto.externalId },
          "Équipe domicile/extérieur introuvable, match ignoré",
        );
        continue;
      }

      await prisma.fixture.upsert({
        where: { provider_externalId: { provider: "api-football", externalId: fixtureDto.externalId } },
        create: {
          provider: "api-football",
          externalId: fixtureDto.externalId,
          competitionId: competition.id,
          seasonId: season.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          round: fixtureDto.round,
          kickoffAt: new Date(fixtureDto.kickoffAt),
          status: fixtureDto.status,
          minute: fixtureDto.minute,
          homeScore: fixtureDto.homeScore,
          awayScore: fixtureDto.awayScore,
          venueName: fixtureDto.venueName,
          referee: fixtureDto.referee,
        },
        update: {
          status: fixtureDto.status,
          minute: fixtureDto.minute,
          homeScore: fixtureDto.homeScore,
          awayScore: fixtureDto.awayScore,
        },
      });
    }

    logger.info(
      { competition: competition.name, teams: teams.length, fixtures: fixtures.length },
      "Compétition synchronisée",
    );
  }
}
