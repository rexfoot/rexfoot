import { prisma } from "@rexfoot/db";
import type { FavoriteEntityType } from "@rexfoot/db";

/** `false` sans requête si personne n'est connecté — évite un aller-retour DB inutile. */
export async function isFavorited(
  userId: string | null,
  entityType: FavoriteEntityType,
  entityId: string,
): Promise<boolean> {
  if (!userId) return false;
  const favorite = await prisma.favorite.findUnique({
    where: { userId_entityType_entityId: { userId, entityType, entityId } },
  });
  return !!favorite;
}

/** Favoris d'un utilisateur, résolus en entités affichables (nom, slug, logo/crest/photo). */
export async function getFavoritesForUser(userId: string) {
  const favorites = await prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });

  const teamIds = favorites.filter((f) => f.entityType === "TEAM").map((f) => f.entityId);
  const playerIds = favorites.filter((f) => f.entityType === "PLAYER").map((f) => f.entityId);
  const competitionIds = favorites.filter((f) => f.entityType === "COMPETITION").map((f) => f.entityId);

  const [teams, players, competitions] = await Promise.all([
    teamIds.length
      ? prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true, slug: true, crestUrl: true } })
      : [],
    playerIds.length
      ? prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, displayName: true, slug: true, photoUrl: true },
        })
      : [],
    competitionIds.length
      ? prisma.competition.findMany({
          where: { id: { in: competitionIds } },
          select: { id: true, name: true, slug: true, logoUrl: true },
        })
      : [],
  ]);

  return { teams, players, competitions };
}
