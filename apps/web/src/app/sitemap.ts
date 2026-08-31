import type { MetadataRoute } from "next";
import { prisma } from "@rexfoot/db";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

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

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/matches`, changeFrequency: "always", priority: 0.9 },
    { url: `${siteUrl}/video`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${siteUrl}/news`, changeFrequency: "hourly", priority: 0.8 },
  ];

  return [
    ...staticEntries,
    ...competitions.map((c) => ({ url: `${siteUrl}/competitions/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ...teams.map((t) => ({ url: `${siteUrl}/teams/${t.slug}`, lastModified: t.updatedAt, priority: 0.6 })),
    ...players.map((p) => ({ url: `${siteUrl}/players/${p.slug}`, lastModified: p.updatedAt, priority: 0.5 })),
    ...videos.map((v) => ({ url: `${siteUrl}/video/${v.slug}`, lastModified: v.updatedAt, priority: 0.5 })),
    ...articles.map((a) => ({ url: `${siteUrl}/news/${a.slug}`, lastModified: a.updatedAt, priority: 0.5 })),
  ];
}
