import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { createVideoProvider, VideoProviderError } from "@rexfoot/video-provider";
import { requirePermission, apiError } from "@/lib/api-response";

/** Même mécanique que POST /api/admin/videos/[id]/sync — voir son commentaire. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageTalents");
  if (!admin) return response;

  const { id } = await params;
  const talent = await prisma.talentProfile.findUnique({ where: { id }, select: { videoId: true } });
  if (!talent?.videoId) return apiError(404, "Aucune vidéo attachée à ce profil.");

  const video = await prisma.video.findUnique({ where: { id: talent.videoId } });
  if (!video?.providerAssetId) return apiError(400, "Cette vidéo n'a pas d'identifiant fournisseur.");

  try {
    const details = await createVideoProvider().getDetails(video.providerAssetId);
    const updated = await prisma.video.update({
      where: { id: video.id },
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
