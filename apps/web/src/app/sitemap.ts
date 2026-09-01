import type { MetadataRoute } from "next";
import { prisma } from "@rexfoot/db";
import { routing } from "@/i18n/routing";
import { localizedUrl } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

interface RouteEntry {
  pathname: string;
  lastModified?: Date;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
}

// Les segments d'URL ne sont pas traduits (voir i18n/routing.ts) : chaque route
// existe dans les 3 langues, une seule fois par langue, reliées entre elles
// par `alternates.languages` (hreflang) — c'est ça, un "sitemap par langue".
function expand(entries: RouteEntry[]): MetadataRoute.Sitemap {
  return entries.flatMap(({ pathname, ...rest }) => {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = localizedUrl(locale, pathname);
    }
    languages["x-default"] = languages[routing.defaultLocale];

    return routing.locales.map((locale) => ({
      url: languages[locale],
      alternates: { languages },
      ...rest,
    }));
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teams, players, competitions, videos, articles] = await Promise.all([
    prisma.team.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.player.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.competition.findMany({ select: { slug: true, updatedAt: true }, where: { isActive: true } }),
    prisma.video.findMany({
      select: { slug: true, updatedAt: true },
      where: { moderationStatus: "APPROVED", publishedAt: { not: null } },
    }),
    prisma.newsArticle.findMany({ select: { slug: true, updatedAt: true }, where: { status: "PUBLISHED" } }),
  ]);

  return [
    ...expand([
      { pathname: "/", changeFrequency: "hourly", priority: 1 },
      { pathname: "/now", changeFrequency: "always", priority: 0.9 },
      { pathname: "/matches", changeFrequency: "always", priority: 0.9 },
      { pathname: "/video", changeFrequency: "hourly", priority: 0.8 },
      { pathname: "/news", changeFrequency: "hourly", priority: 0.8 },
      { pathname: "/analysis", changeFrequency: "daily", priority: 0.7 },
      { pathname: "/classements", changeFrequency: "daily", priority: 0.7 },
      { pathname: "/mercato", changeFrequency: "hourly", priority: 0.7 },
      { pathname: "/login", changeFrequency: "yearly", priority: 0.3 },
      { pathname: "/signup", changeFrequency: "yearly", priority: 0.3 },
    ]),
    ...expand(
      competitions.map((c) => ({ pathname: `/competitions/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ),
    ...expand(teams.map((t) => ({ pathname: `/teams/${t.slug}`, lastModified: t.updatedAt, priority: 0.6 }))),
    ...expand(players.map((p) => ({ pathname: `/players/${p.slug}`, lastModified: p.updatedAt, priority: 0.5 }))),
    ...expand(videos.map((v) => ({ pathname: `/video/${v.slug}`, lastModified: v.updatedAt, priority: 0.5 }))),
    ...expand(articles.map((a) => ({ pathname: `/news/${a.slug}`, lastModified: a.updatedAt, priority: 0.5 }))),
  ];
}
