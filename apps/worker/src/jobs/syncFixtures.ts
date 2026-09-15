import { prisma } from "@rexfoot/db";
import { hasAnyFootballProviderKey } from "@rexfoot/config";
import { createFootballProvider, getActiveProviderName } from "@rexfoot/football-provider";
import { resolveFeaturedCompetitions } from "../lib/competitions.js";
import { upsertSeason, upsertTeam } from "../lib/upsert.js";
import { logger } from "../lib/logger.js";

const PROVIDER_NAME = getActiveProviderName();

const WINDOW_DAYS_PAST = 3;
const WINDOW_DAYS_FUTURE = 14;

/**
 * Synchronise, pour chaque compétition vedette : la saison courante, les
 * équipes, puis les matchs de la fenêtre [-3j, +14j]. C'est le job qui pose
 * les fondations (équipes) dont dépendent les autres jobs (syncLiveScores,
 * syncStandings, syncPlayerStats). Les effectifs (joueurs) sont synchronisés
 * séparément par syncRosters.ts, à un rythme beaucoup plus rare — un appel
 * getPlayers par équipe est le poste de coût dominant sur le plan gratuit
 * API-Football (100 req/jour), inutile de le refaire à chaque cycle.
 */
export async function syncFixtures(): Promise<void> {
  if (!hasAnyFootballProviderKey()) {
    logger.info("Aucune clé de fournisseur football — syncFixtures ignoré (aucune fausse donnée générée)");
    return;
  }

  const provider = createFootballProvider();
  const featured = await resolveFeaturedCompetitions(provider);

  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - WINDOW_DAYS_PAST);
  const dateTo = new Date();
  dateTo.setDate(dateTo.getDate() + WINDOW_DAYS_FUTURE);

  for (const { competition, externalId: competitionExternalId } of featured) {
    // Chaque compétition est traitée dans son propre try/catch pour qu'une
    // erreur sur l'une (404, quota, etc.) n'empêche pas le traitement des
    // suivantes — sinon le job entier plante sur la première en échec.
    try {
      if (!competitionExternalId) {
        logger.info({ competition: competition.name }, "Compétition sans ID externe (fournisseur non couvert), synchronisation des fixtures ignorée");
        continue;
      }

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

        // syncFixtures pose le calendrier (équipes, horaires) ; le SUIVI EN
        // DIRECT (statut/minute/score) appartient exclusivement à
        // syncLiveScores.ts une fois qu'un match a commencé. Bug réel constaté
        // en prod (2026-09-05) : ce job, relancé par un redémarrage du worker,
        // a réécrit "SCHEDULED, score vide" sur un match que syncLiveScores
        // venait de passer correctement en LIVE — l'endpoint "calendrier"
        // général de football-data.org ne reflète pas aussi vite qu'un match a
        // démarré que l'endpoint dédié aux scores en direct. On ne touche donc
        // plus status/minute/score ici une fois qu'un match n'est plus
        // SCHEDULED (mais on garde round/venue/referee à jour, qui ne posent
        // pas ce risque, et on laisse passer une éventuelle annonce de report/
        // annulation détectée AVANT le coup d'envoi).
        const existing = await prisma.fixture.findUnique({
          where: { provider_externalId: { provider: PROVIDER_NAME, externalId: fixtureDto.externalId } },
          select: { status: true },
        });
        const liveTrackingStarted = existing !== null && existing.status !== "SCHEDULED";

        await prisma.fixture.upsert({
          where: { provider_externalId: { provider: PROVIDER_NAME, externalId: fixtureDto.externalId } },
          create: {
            provider: PROVIDER_NAME,
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
            round: fixtureDto.round,
            venueName: fixtureDto.venueName,
            referee: fixtureDto.referee,
            ...(liveTrackingStarted
              ? {}
              : {
                  status: fixtureDto.status,
                  minute: fixtureDto.minute,
                  homeScore: fixtureDto.homeScore,
                  awayScore: fixtureDto.awayScore,
                }),
          },
        });
      }

      logger.info(
        { competition: competition.name, teams: teams.length, fixtures: fixtures.length },
        "Compétition synchronisée",
      );
    } catch (err) {
      logger.error({ competition: competition.name, err }, "Échec de synchronisation de la compétition — ignorée, les suivantes continuent");
    }
  }
}
