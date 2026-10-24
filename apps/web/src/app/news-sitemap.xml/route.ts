import { prisma } from "@rexfoot/db";
import { localizedUrl } from "@/lib/seo/alternates";

export const dynamic = "force-dynamic";

// Google News n'accepte que les articles des 2 derniers jours dans ce sitemap.
const WINDOW_MS = 48 * 60 * 60 * 1000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Sitemap Google News : seulement les articles originaux RexFoot (version française canonique). */
export async function GET() {
  const articles = await prisma.newsArticle.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - WINDOW_MS) } },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, title: true, publishedAt: true },
    take: 1000,
  });

  const items = articles
    .map(
      (a) => `  <url>
    <loc>${escapeXml(localizedUrl("fr", `/news/${a.slug}`))}</loc>
    <news:news>
      <news:publication><news:name>RexFoot</news:name><news:language>fr</news:language></news:publication>
      <news:publication_date>${a.publishedAt!.toISOString()}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
