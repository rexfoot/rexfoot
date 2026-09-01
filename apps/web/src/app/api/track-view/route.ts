import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { apiError, enforceRateLimit } from "@/lib/api-response";
import { getRedis } from "@/lib/redis";

const VISITOR_COOKIE = "rf_visitor";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an
const DEDUP_TTL_SECONDS = 30 * 60; // 30 min : un même visiteur ne recompte pas la même page en boucle

const bodySchema = z.object({
  entityType: z.enum(["ARTICLE", "VIDEO", "TEAM", "PLAYER"]),
  entityId: z.string().min(1),
});

/**
 * Compte une vue réelle pour les tendances (section 19 du plan) — jamais de
 * chiffre inventé. Dédupliqué par visiteur anonyme via Redis (pas de compte
 * requis) pour qu'un rafraîchissement répété ne gonfle pas le classement.
 */
export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:track-view");
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Requête invalide.");
  const { entityType, entityId } = parsed.data;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(new RegExp(`${VISITOR_COOKIE}=([^;]+)`));
  const visitorKey = cookieMatch?.[1] ?? randomUUID();

  const response = NextResponse.json({ ok: true });
  if (!cookieMatch) {
    response.cookies.set(VISITOR_COOKIE, visitorKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }

  const dedupKey = `view-dedup:${entityType}:${entityId}:${visitorKey}`;
  const wasNewlySet = await getRedis().set(dedupKey, "1", "EX", DEDUP_TTL_SECONDS, "NX");
  if (wasNewlySet === null) return response; // déjà compté récemment pour ce visiteur

  await prisma.pageView.create({ data: { entityType, entityId } });
  if (entityType === "VIDEO") {
    await prisma.video.update({ where: { id: entityId }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  return response;
}
