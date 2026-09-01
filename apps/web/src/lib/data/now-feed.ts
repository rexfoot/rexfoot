import { prisma } from "@rexfoot/db";
import type { NewsCategory, Transfer } from "@rexfoot/db";
import type { MatchSummary, VideoSummary } from "@/lib/types";

const FEED_ITEM_LIMIT = 12;
const MATCH_WINDOW_HOURS = 48;

interface FeedArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  isBreaking: boolean;
  breakingSince: Date | null;
  category: NewsCategory;
}

export type NowFeedItem =
  | { kind: "news"; timestamp: Date; article: FeedArticle }
  | { kind: "video"; timestamp: Date; video: VideoSummary }
  | { kind: "transfer"; timestamp: Date; transfer: Transfer }
  | { kind: "match"; timestamp: Date; match: MatchSummary; isFavorite: boolean };

const matchSelect = {
  id: true,
  kickoffAt: true,
  status: true,
  minute: true,
  homeScore: true,
  awayScore: true,
  homeTeamId: true,
  awayTeamId: true,
  competitionId: true,
  homeTeam: { select: { name: true, slug: true, crestUrl: true } },
  awayTeam: { select: { name: true, slug: true, crestUrl: true } },
  competition: { select: { name: true, slug: true, logoUrl: true } },
} as const;

/**
 * RexFoot Now — flux unique mêlant actus, matchs, vidéos et mercato, trié
 * par horodatage réel de chaque élément (pas de score d'engagement inventé).
 * Les matchs impliquant un club/compétition favori du visiteur sont
 * simplement signalés (`isFavorite`), jamais filtrés : le flux reste complet
 * même sans compte ou sans favoris.
 */
export async function getNowFeed(
  favoriteTeamIds: string[] = [],
  favoriteCompetitionIds: string[] = [],
  limit = FEED_ITEM_LIMIT,
): Promise<NowFeedItem[]> {
  const now = Date.now();
  const windowStart = new Date(now - MATCH_WINDOW_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now + MATCH_WINDOW_HOURS * 60 * 60 * 1000);

  const [articles, videos, transfers, fixtures] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImageUrl: true,
        publishedAt: true,
        isBreaking: true,
        breakingSince: true,
        category: true,
      },
      take: limit,
    }),
    prisma.video.findMany({
      where: { moderationStatus: "APPROVED", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { id: true, slug: true, title: true, thumbnailUrl: true, durationSeconds: true, viewCount: true, status: true, publishedAt: true },
      take: limit,
    }),
    prisma.transfer.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: limit,
    }),
    prisma.fixture.findMany({
      where: { kickoffAt: { gte: windowStart, lte: windowEnd } },
      orderBy: { kickoffAt: "desc" },
      select: matchSelect,
      take: limit,
    }),
  ]);

  const items: NowFeedItem[] = [
    ...articles.map((article): NowFeedItem => ({ kind: "news", timestamp: article.publishedAt!, article })),
    ...videos.map(
      (video): NowFeedItem => ({ kind: "video", timestamp: video.publishedAt!, video }),
    ),
    ...transfers.map((transfer): NowFeedItem => ({ kind: "transfer", timestamp: transfer.publishedAt!, transfer })),
    ...fixtures.map((fixture): NowFeedItem => {
      const isFavorite =
        favoriteTeamIds.includes(fixture.homeTeamId) ||
        favoriteTeamIds.includes(fixture.awayTeamId) ||
        favoriteCompetitionIds.includes(fixture.competitionId);
      return {
        kind: "match",
        timestamp: fixture.kickoffAt,
        isFavorite,
        match: { ...fixture, kickoffAt: fixture.kickoffAt.toISOString() },
      };
    }),
  ];

  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return items.slice(0, limit);
}
