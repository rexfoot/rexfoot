import { prisma } from "@rexfoot/db";
import { hasFootballApiKey } from "@rexfoot/config";
import { createFootballProvider } from "@rexfoot/football-provider";
import { upsertPlayer } from "../lib/upsert.js";
import { logger } from "../lib/logger.js";

// Une équipe non encore synchronisée coûte 1 appel getPlayers. Plafonner par
// exécution étale le "bootstrap" initial des ~140 équipes des compétitions
// vedettes sur plusieurs cycles plutôt que d'épuiser le quota jour en un
// coup — voir apps/worker/src/scheduler.ts pour le budget global.
const MAX_TEAMS_PER_RUN = 12;

/**
 * Synchronise les effectifs (joueurs) des équipes qui n'en ont pas encore.
 * Contrairement à syncFixtures/syncStandings, ne retraite jamais une équipe
 * déjà synchronisée pour sa saison courante — les transferts en cours de
 * saison ne sont donc pas répercutés automatiquement pour l'instant (limite
 * acceptée pour rester dans le plan gratuit API-Football).
 */
export async function syncRosters(): Promise<void> {
  if (!hasFootballApiKey()) {
    logger.info("RAPIDAPI_KEY absent — syncRosters ignoré (aucune fausse donnée générée)");
    return;
  }

  const provider = createFootballProvider();

  const teamsMissingRoster = await prisma.teamCompetitionSeason.findMany({
    where: { season: { isCurrent: true }, team: { playerMemberships: { none: {} } } },
    distinct: ["teamId"],
    take: MAX_TEAMS_PER_RUN,
    select: {
      season: { select: { id: true, externalId: true } },
      team: { select: { id: true, externalId: true, name: true } },
    },
  });

  if (teamsMissingRoster.length === 0) {
    logger.info("Tous les effectifs vedettes sont déjà synchronisés");
    return;
  }

  for (const { team, season } of teamsMissingRoster) {
    const players = await provider.getPlayers({
      teamExternalId: team.externalId,
      seasonExternalId: season.externalId,
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

    logger.info({ team: team.name, players: players.length }, "Effectif synchronisé");
  }
}
