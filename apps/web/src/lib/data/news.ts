import { prisma } from "@rexfoot/db";
import { PAGE_SIZE_DEFAULT } from "@rexfoot/config";

export async function getPublishedNews(limit = PAGE_SIZE_DEFAULT) {
  return prisma.newsArticle.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: { id: true, slug: true, title: true, summary: true, coverImageUrl: true, publishedAt: true },
    take: limit,
  });
}

export async function getNewsArticleBySlug(slug: string) {
  return prisma.newsArticle.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { author: { select: { displayName: true } }, relatedCompetition: true, relatedTeam: true, relatedPlayer: true },
  });
}
