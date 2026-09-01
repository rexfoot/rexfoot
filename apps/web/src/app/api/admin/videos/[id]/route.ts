import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { createVideoProvider } from "@rexfoot/video-provider";
import { requirePermission, apiError } from "@/lib/api-response";

const bodySchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères."),
  description: z.string().trim().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageVideos");
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
  const { admin, response } = await requirePermission(request, "manageVideos");
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.video.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Vidéo introuvable.");

  if (existing.providerAssetId) {
    // Best-effort : le fichier local (DB) est supprimé même en cas d'échec
    // côté fournisseur vidéo, mais l'échec doit rester visible (logs Railway)
    // plutôt que disparaître silencieusement — sinon un asset reste orphelin
    // chez le fournisseur sans que personne ne le sache jamais.
    await createVideoProvider()
      .delete(existing.providerAssetId)
      .catch((error) => {
        console.error(
          `Échec de la suppression de l'asset ${existing.providerAssetId} chez le fournisseur vidéo :`,
          error,
        );
      });
  }
  await prisma.video.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
