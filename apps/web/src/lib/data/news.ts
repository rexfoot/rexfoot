import { prisma } from "@rexfoot/db";
import { PAGE_SIZE_DEFAULT, BREAKING_NEWS_WINDOW_HOURS } from "@rexfoot/config";

export async function getPublishedNews(limit = PAGE_SIZE_DEFAULT) {
  return prisma.newsArticle.findMany({
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
  });
}

/** RexFoot Analysis — sous-section éditoriale de l'actualité, filtrée sur NewsCategory.ANALYSES. */
export async function getAnalysisArticles(limit = PAGE_SIZE_DEFAULT) {
  return prisma.newsArticle.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null }, category: "ANALYSES" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      coverImageUrl: true,
      publishedAt: true,
      category: true,
    },
    take: limit,
  });
}

/**
 * Portraits — remplace Mercato dans le menu principal (demandé par Hicham le
 * 2026-09-12 : aucun trafic sur /mercato, alors que les rumeurs de transfert
 * peuvent toujours être publiées comme un article normal, catégorie
 * TRANSFERTS). Même principe que getAnalysisArticles, filtrée sur
 * NewsCategory.PORTRAITS.
 */
export async function getPortraitArticles(limit = PAGE_SIZE_DEFAULT) {
  return prisma.newsArticle.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null }, category: "PORTRAITS" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      coverImageUrl: true,
      publishedAt: true,
      category: true,
    },
    take: limit,
  });
}

export async function getNewsArticleBySlug(slug: string) {
  return prisma.newsArticle.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { author: { select: { displayName: true } }, relatedCompetition: true, relatedTeam: true, relatedPlayer: true },
  });
}

/** Alertes actives (section 12 du plan) — jamais périmées, voir BREAKING_NEWS_WINDOW_HOURS. */
export async function getActiveBreakingNews(limit = 5) {
  const since = new Date(Date.now() - BREAKING_NEWS_WINDOW_HOURS * 60 * 60 * 1000);

  return prisma.newsArticle.findMany({
    where: { status: "PUBLISHED", isBreaking: true, breakingSince: { not: null, gte: since } },
    orderBy: [{ breakingPriority: "desc" }, { breakingSince: "desc" }],
    select: { id: true, slug: true, title: true, breakingPriority: true },
    take: limit,
  });
}
