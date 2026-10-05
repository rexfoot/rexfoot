import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { z } from "zod";
import { apiError, enforceRateLimit } from "@/lib/api-response";

const subscriptionSchema = z.object({
  matchId: z.string().min(1),
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

/**
 * Abonne ce navigateur aux buts d'un match (Web Push, sans compte).
 * L'endpoint fait office d'identité : un seul abonnement par (match,
 * endpoint) — réabonner écrase simplement les clés (rotation normale).
 * 404 si le match n'existe pas, 503 si VAPID non configuré.
 */
export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:push-subscribe");
  if (rateLimitResponse) return rateLimitResponse;

  if (!process.env.VAPID_PUBLIC_KEY) return apiError(503, "Alertes push non configurées.");

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Abonnement invalide.");
  const { matchId, endpoint, p256dh, auth } = parsed.data;

  const match = await prisma.fixture.findUnique({ where: { id: matchId }, select: { id: true } });
  if (!match) return apiError(404, "Match introuvable.");

  await prisma.pushSubscription.upsert({
    where: { matchId_endpoint: { matchId, endpoint } },
    create: { matchId, endpoint, p256dh, auth },
    update: { p256dh, auth },
  });

  return NextResponse.json({ ok: true });
}

/** Désabonne ce navigateur (endpoint) d'un match. Idempotent. */
export async function DELETE(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:push-subscribe");
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = z.object({ matchId: z.string().min(1), endpoint: z.string().url() }).safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(400, "Requête invalide.");

  await prisma.pushSubscription.deleteMany({
    where: { matchId: parsed.data.matchId, endpoint: parsed.data.endpoint },
  });
  return NextResponse.json({ ok: true });
}
