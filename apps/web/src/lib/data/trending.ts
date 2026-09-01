import { prisma } from "@rexfoot/db";
import type { TrendingEntityType } from "@rexfoot/db";

const TRENDING_WINDOW_DAYS = 7;

export interface TrendingItem {
  type: TrendingEntityType;
  href: string;
  title: string;
  imageUrl: string | null;
}

async function topEntityId(entityType: TrendingEntityType, since: Date): Promise<string | null> {
  const [top] = await prisma.pageView.groupBy({
    by: ["entityId"],
    where: { entityType, createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { entityId: "desc" } },
    take: 1,
  });
  return top?.entityId ?? null;
}

/** Le plus consulté de chaque type sur les 7 derniers jours — jamais de données inventées, voir PageView. */
export async function getTrending(): Promise<TrendingItem[]> {
  const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [articleId, videoId, teamId, playerId] = await Promise.all([
    topEntityId("ARTICLE", since),
    topEntityId("VIDEO", since),
    topEntityId("TEAM", since),
    topEntityId("PLAYER", since),
  ]);

  const [article, video, team, player] = await Promise.all([
    articleId
      ? prisma.newsArticle.findUnique({
          where: { id: articleId, status: "PUBLISHED" },
          select: { slug: true, title: true, coverImageUrl: true },
        })
      : null,
    videoId
      ? prisma.video.findUnique({
          where: { id: videoId, moderationStatus: "APPROVED", publishedAt: { not: null } },
          select: { slug: true, title: true, thumbnailUrl: true },
        })
      : null,
    teamId ? prisma.team.findUnique({ where: { id: teamId }, select: { slug: true, name: true, crestUrl: true } }) : null,
    playerId
      ? prisma.player.findUnique({ where: { id: playerId }, select: { slug: true, displayName: true, photoUrl: true } })
      : null,
  ]);

  const items: TrendingItem[] = [];
  if (article) items.push({ type: "ARTICLE", href: `/news/${article.slug}`, title: article.title, imageUrl: article.coverImageUrl });
  if (video) items.push({ type: "VIDEO", href: `/video/${video.slug}`, title: video.title, imageUrl: video.thumbnailUrl });
  if (team) items.push({ type: "TEAM", href: `/teams/${team.slug}`, title: team.name, imageUrl: team.crestUrl });
  if (player) items.push({ type: "PLAYER", href: `/players/${player.slug}`, title: player.displayName, imageUrl: player.photoUrl });

  return items;
}
