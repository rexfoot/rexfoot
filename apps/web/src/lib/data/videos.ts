import { prisma } from "@rexfoot/db";
import { PAGE_SIZE_VIDEOS } from "@rexfoot/config";
import type { VideoSummary } from "@/lib/types";

const videoSelect = {
  id: true,
  slug: true,
  title: true,
  thumbnailUrl: true,
  durationSeconds: true,
  viewCount: true,
  status: true,
} as const;

/** Vidéos publiées et approuvées par la modération — jamais de contenu PENDING/REJECTED côté public. */
export async function getPublishedVideos(limit = PAGE_SIZE_VIDEOS): Promise<VideoSummary[]> {
  return prisma.video.findMany({
    where: { moderationStatus: "APPROVED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: videoSelect,
    take: limit,
  });
}

export async function getVideoBySlug(slug: string) {
  return prisma.video.findFirst({
    where: { slug, moderationStatus: "APPROVED", publishedAt: { not: null } },
    include: {
      tags: { include: { videoTag: true } },
      relatedFixture: { include: { homeTeam: true, awayTeam: true } },
      relatedTeam: true,
      relatedPlayer: true,
    },
  });
}

export async function getRelatedVideos(videoId: string, limit = 8): Promise<VideoSummary[]> {
  return prisma.video.findMany({
    where: { moderationStatus: "APPROVED", publishedAt: { not: null }, id: { not: videoId } },
    orderBy: { publishedAt: "desc" },
    select: videoSelect,
    take: limit,
  });
}
