import { NextResponse } from "next/server";
import type { FavoriteEntityType } from "@rexfoot/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { isFavorited } from "@/lib/data/favorites";
import { apiError } from "@/lib/api-response";

const VALID_TYPES: FavoriteEntityType[] = ["TEAM", "PLAYER", "COMPETITION"];

/**
 * Lu côté client par <FavoriteButton> plutôt que côté serveur sur les pages
 * club/joueur/compétition : ces pages restent en ISR (`revalidate`), donc pas
 * de `cookies()` là-bas — l'état personnalisé du cœur se résout après coup.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") as FavoriteEntityType | null;
  const entityId = searchParams.get("entityId");

  if (!entityType || !VALID_TYPES.includes(entityType) || !entityId) {
    return apiError(400, "Paramètres invalides.");
  }

  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ isLoggedIn: false, favorited: false });

  const favorited = await isFavorited(user.id, entityType, entityId);
  return NextResponse.json({ isLoggedIn: true, favorited });
}
