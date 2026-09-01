import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { createVideoProvider } from "@rexfoot/video-provider";
import { requireAdmin, apiError } from "@/lib/api-response";

const bodySchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères."),
  description: z.string().trim().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin(request);
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.video.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Vidéo introuvable.");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  await prisma.video.update({
    where: { id },
    data: { title: parsed.data.title, description: parsed.data.description || null },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin(request);
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.video.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Vidéo introuvable.");

  if (existing.providerAssetId) {
    await createVideoProvider()
      .delete(existing.providerAssetId)
      .catch(() => {});
  }
  await prisma.video.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
