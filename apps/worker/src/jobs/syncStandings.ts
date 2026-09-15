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
    try {
      if (!competitionExternalId) {
        logger.info({ competition: competition.name }, "Compétition sans ID externe (fournisseur non couvert), classement ignoré");
        continue;
      }

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
          select: { id: true, position: true },
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
          // previousPosition capture la position d'AVANT ce sync (demandé par
          // Hicham le 2026-09-05, pour afficher une flèche montée/descente sous
          // le nom de l'équipe) — jamais renseigné à la création (rien à
          // comparer), toujours écrasé par l'ancienne `position` à la mise à
          // jour, même si elle n'a pas bougé (dans ce cas previousPosition ==
          // position, donc pas de flèche affichée côté web, ce qui est correct).
          update: {
            position: row.position,
            previousPosition: existing?.position ?? null,
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
    } catch (err) {
      logger.error({ competition: competition.name, err }, "Échec de synchronisation du classement — ignoré, les suivants continuent");
    }
  }
}
