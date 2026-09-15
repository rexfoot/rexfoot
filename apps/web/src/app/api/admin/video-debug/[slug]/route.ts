import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-response";
import { prisma } from "@rexfoot/db";

/**
 * GET /api/admin/video-debug/[slug]
 * Retourne les données brutes d'une vidéo pour débogage admin.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { admin, response } = await requireAdmin(_request);
  if (!admin) return response;

  const { slug } = await params;

  const video = await prisma.video.findFirst({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      providerName: true,
      providerAssetId: true,
      playbackUrl: true,
      status: true,
      moderationStatus: true,
      thumbnailUrl: true,
      durationSeconds: true,
      publishedAt: true,
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Vidéo introuvable" }, { status: 404 });
  }

  return NextResponse.json(video);
}
