import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { requireUser, apiError, enforceRateLimit } from "@/lib/api-response";

const bodySchema = z.object({
  entityType: z.enum(["TEAM", "PLAYER", "COMPETITION"]),
  entityId: z.string().min(1),
});

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:favorites");
  if (rateLimitResponse) return rateLimitResponse;

  const { user, response } = await requireUser(request);
  if (!user) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Requête invalide.");

  await prisma.favorite.upsert({
    where: {
      userId_entityType_entityId: {
        userId: user.id,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
      },
    },
    update: {},
    create: { userId: user.id, entityType: parsed.data.entityType, entityId: parsed.data.entityId },
  });

  return NextResponse.json({ ok: true, favorited: true });
}

export async function DELETE(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:favorites");
  if (rateLimitResponse) return rateLimitResponse;

  const { user, response } = await requireUser(request);
  if (!user) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Requête invalide.");

  await prisma.favorite.deleteMany({
    where: { userId: user.id, entityType: parsed.data.entityType, entityId: parsed.data.entityId },
  });

  return NextResponse.json({ ok: true, favorited: false });
}
