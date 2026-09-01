import { prisma } from "@rexfoot/db";
import { getFavoritesForUser } from "./favorites";

/** `null` si le compte n'existe pas, n'est plus actif, ou n'a pas activé son profil public — jamais de fuite. */
export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, avatarUrl: true, status: true, publicProfile: true, createdAt: true },
  });
  if (!user || user.status !== "ACTIVE" || !user.publicProfile) return null;

  const favorites = await getFavoritesForUser(user.id);
  return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, createdAt: user.createdAt, favorites };
}
