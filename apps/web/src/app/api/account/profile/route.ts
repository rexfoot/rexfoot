import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { requireUser, apiError } from "@/lib/api-response";

const bodySchema = z.object({ publicProfile: z.boolean() });

export async function PATCH(request: Request) {
  const { user, response } = await requireUser(request);
  if (!user) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Requête invalide.");

  await prisma.user.update({ where: { id: user.id }, data: { publicProfile: parsed.data.publicProfile } });
  return NextResponse.json({ ok: true });
}
