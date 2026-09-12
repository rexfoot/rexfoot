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

// Fenêtre calquée sur syncFixtures (apps/worker) : les seuls matchs dont la
// base est réellement à jour. Au-delà, l'entrée existerait mais pointerait
// vers des données jamais rafraîchies par le worker.
const MATCH_WINDOW_DAYS_PAST = 3;
const MATCH_WINDOW_DAYS_FUTURE = 14;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const matchDateFrom = new Date();
  matchDateFrom.setDate(matchDateFrom.getDate() - MATCH_WINDOW_DAYS_PAST);
  const matchDateTo = new Date();
  matchDateTo.setDate(matchDateTo.getDate() + MATCH_WINDOW_DAYS_FUTURE);

  const [teams, players, competitions, videos, articles, talents, matches] = await Promise.all([
    prisma.team.findMany({ select: { slug: true, updatedAt: true } }),
    // Sans ce filtre, tous les joueurs jamais synchronisés (partis depuis
    // longtemps inclus) finissent dans le sitemap : ~2800 joueurs × 3 langues,
    // 89% des URLs du sitemap, qui dilue le budget de crawl de Google au
    // détriment des articles/pages à forte valeur.
    prisma.player.findMany({
      select: { slug: true, updatedAt: true },
      where: { teamMemberships: { some: { leftAt: null } } },
    }),
    prisma.competition.findMany({ select: { slug: true, updatedAt: true }, where: { isActive: true } }),
    prisma.video.findMany({
      select: { slug: true, updatedAt: true },
      where: { moderationStatus: "APPROVED", publishedAt: { not: null } },
    }),
    prisma.newsArticle.findMany({ select: { slug: true, updatedAt: true }, where: { status: "PUBLISHED" } }),
    prisma.talentProfile.findMany({ select: { slug: true, updatedAt: true }, where: { status: "APPROVED" } }),
    prisma.fixture.findMany({
      select: { id: true, updatedAt: true, status: true },
      where: { kickoffAt: { gte: matchDateFrom, lte: matchDateTo } },
    }),
  ]);

  return [
    ...expand([
      { pathname: "/", changeFrequency: "hourly", priority: 1 },
      { pathname: "/now", changeFrequency: "always", priority: 0.9 },
      { pathname: "/matches", changeFrequency: "always", priority: 0.9 },
      { pathname: "/video", changeFrequency: "hourly", priority: 0.8 },
      { pathname: "/news", changeFrequency: "hourly", priority: 0.8 },
      { pathname: "/talents", changeFrequency: "daily", priority: 0.7 },
      { pathname: "/talents/decouvrir", changeFrequency: "daily", priority: 0.7 },
      { pathname: "/talents/recruteurs", changeFrequency: "weekly", priority: 0.5 },
      { pathname: "/analysis", changeFrequency: "daily", priority: 0.7 },
      { pathname: "/portraits", changeFrequency: "daily", priority: 0.7 },
      { pathname: "/classements", changeFrequency: "daily", priority: 0.7 },
      // Retiré du menu principal le 2026-09-12 (voir lib/nav.ts) mais la page
      // et ses données existent toujours — priorité abaissée plutôt que
      // supprimée, l'URL reste valide et indexable.
      { pathname: "/mercato", changeFrequency: "weekly", priority: 0.4 },
      { pathname: "/login", changeFrequency: "yearly", priority: 0.3 },
      { pathname: "/signup", changeFrequency: "yearly", priority: 0.3 },
      { pathname: "/mentions-legales", changeFrequency: "yearly", priority: 0.2 },
      { pathname: "/confidentialite", changeFrequency: "yearly", priority: 0.2 },
      { pathname: "/supprimer-mon-compte", changeFrequency: "yearly", priority: 0.2 },
    ]),
    ...expand(
      competitions.map((c) => ({ pathname: `/competitions/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ),
    ...expand(teams.map((t) => ({ pathname: `/teams/${t.slug}`, lastModified: t.updatedAt, priority: 0.6 }))),
    ...expand(players.map((p) => ({ pathname: `/players/${p.slug}`, lastModified: p.updatedAt, priority: 0.5 }))),
    ...expand(videos.map((v) => ({ pathname: `/video/${v.slug}`, lastModified: v.updatedAt, priority: 0.5 }))),
    ...expand(articles.map((a) => ({ pathname: `/news/${a.slug}`, lastModified: a.updatedAt, priority: 0.5 }))),
    ...expand(talents.map((tl) => ({ pathname: `/talents/${tl.slug}`, lastModified: tl.updatedAt, priority: 0.5 }))),
    ...expand(
      matches.map((m): RouteEntry => {
        const isLive = m.status === "LIVE" || m.status === "HALFTIME";
        return {
          pathname: `/matches/${m.id}`,
          lastModified: m.updatedAt,
          changeFrequency: isLive ? "always" : "hourly",
          priority: isLive ? 0.9 : 0.6,
        };
      }),
    ),
  ];
}
