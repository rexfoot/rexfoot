import { prisma } from "@rexfoot/db";
import { hasAnyFootballProviderKey } from "@rexfoot/config";
import { createFootballProvider } from "@rexfoot/football-provider";
import { resolveFeaturedCompetitions } from "../lib/competitions.js";
import { findSeasonByExternalId, findTeamByExternalId } from "../lib/upsert.js";
import { logger } from "../lib/logger.js";

/**
 * Rafraîchit les classements des compétitions vedettes pour leur saison
 * courante. Fréquence recommandée : quelques fois par jour (les classements
 * ne changent qu'après des matchs terminés, pas besoin d'un polling serré).
 */
export async function syncStandings(): Promise<void> {
  if (!hasAnyFootballProviderKey()) {
    logger.info("Aucune clé de fournisseur football — syncStandings ignoré (aucune fausse donnée générée)");
    return;
  }

  const provider = createFootballProvider();
  const featured = await resolveFeaturedCompetitions(provider);

  for (const { competition, externalId: competitionExternalId } of featured) {
    const seasons = await provider.getSeasons(competitionExternalId);
    const currentSeasonDto = seasons.find((s) => s.isCurrent) ?? seasons.at(-1);
    if (!currentSeasonDto) continue;

    const season = await findSeasonByExternalId(currentSeasonDto.externalId);
    if (!season) {
      logger.warn(
        { competition: competition.name },
        "Saison pas encore synchronisée par syncFixtures, classement ignoré",
      );
      continue;
    }

    const standings = await provider.getStandings({
      competitionExternalId,
      seasonExternalId: currentSeasonDto.externalId,
    });

    for (const row of standings) {
      const team = await findTeamByExternalId(row.teamExternalId);
      if (!team) continue;

      // Le champ composé unique inclut `groupName`, nullable — Prisma ne type pas
      // ce cas nettement pour `upsert.where`, on repasse donc par un findFirst.
      const existing = await prisma.standing.findFirst({
        where: {
          competitionId: competition.id,
          seasonId: season.id,
          teamId: team.id,
          groupName: row.groupName,
        },
        select: { id: true },
      });

      await prisma.standing.upsert({
        where: { id: existing?.id ?? "__none__" },
        create: {
          competitionId: competition.id,
          seasonId: season.id,
          teamId: team.id,
          groupName: row.groupName,
          position: row.position,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
          points: row.points,
          form: row.form,
        },
        update: {
          position: row.position,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
          points: row.points,
          form: row.form,
        },
      });
    }

    logger.info({ competition: competition.name, rows: standings.length }, "Classement synchronisé");
  }
}
