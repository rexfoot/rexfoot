import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { createVideoProvider, VideoProviderError } from "@rexfoot/video-provider";
import { requireAdmin, apiError } from "@/lib/api-response";

/**
 * Interroge le fournisseur vidéo pour l'état de transcodage courant et met à
 * jour la fiche en base. Appelé par le client juste après l'upload (poll
 * court) et par le bouton "Actualiser" de la liste admin pour les vidéos
 * restées bloquées en traitement.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin(request);
  if (!admin) return response;

  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) return apiError(404, "Vidéo introuvable.");
  if (!video.providerAssetId) return apiError(400, "Cette vidéo n'a pas d'identifiant fournisseur.");

  try {
    const details = await createVideoProvider().getDetails(video.providerAssetId);
    const updated = await prisma.video.update({
      where: { id },
      data: {
        status: details.status,
        playbackUrl: details.playbackUrl,
        thumbnailUrl: details.thumbnailUrl,
        durationSeconds: details.durationSeconds,
      },
    });
    return NextResponse.json({
      status: updated.status,
      thumbnailUrl: updated.thumbnailUrl,
      durationSeconds: updated.durationSeconds,
    });
  } catch (error) {
    if (error instanceof VideoProviderError) return apiError(502, error.message);
    throw error;
  }
}
