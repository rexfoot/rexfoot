import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-response";
import { prisma } from "@rexfoot/db";

/**
 * POST /api/admin/video-fix-playback
 * Corrige les playbackUrl qui utilisent le domaine legacy iframe.videodelivery.net
 * en utilisant le format customer-{subdomain}.cloudflarestream.com recommandé.
 */
export async function POST(request: Request) {
  const { admin, response } = await requireAdmin(request);
  if (!admin) return response;

  const { videoId } = await request.json().catch(() => ({}));
  if (!videoId || typeof videoId !== "string") {
    return NextResponse.json({ error: "videoId requis" }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, playbackUrl: true, thumbnailUrl: true, providerAssetId: true },
  });

  if (!video) {
    return NextResponse.json({ error: "Vidéo introuvable" }, { status: 404 });
  }

  if (!video.thumbnailUrl || !video.providerAssetId) {
    return NextResponse.json({ error: "thumbnailUrl ou providerAssetId manquant" }, { status: 400 });
  }

  // Extraire le sous-domaine client depuis l'URL thumbnail
  const match = video.thumbnailUrl.match(/https:\/\/customer-([^.]+)\.cloudflarestream\.com\//);
  if (!match) {
    return NextResponse.json({ error: "Impossible d'extraire le sous-domaine Cloudflare depuis l'URL thumbnail" }, { status: 400 });
  }

  const customerSubdomain = match[1];
  const newPlaybackUrl = `https://customer-${customerSubdomain}.cloudflarestream.com/${video.providerAssetId}/iframe`;

  await prisma.video.update({
    where: { id: videoId },
    data: { playbackUrl: newPlaybackUrl },
  });

  return NextResponse.json({
    oldPlaybackUrl: video.playbackUrl,
    newPlaybackUrl,
    customerSubdomain,
  });
}
