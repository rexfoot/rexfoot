import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Newspaper, BarChart3, ChevronRight } from "lucide-react";
import { getMixedNewsFeed } from "@/lib/data/news";
import { NewsCard } from "@/components/NewsCard";
import { HeadlineCard } from "@/components/HeadlineCard";
import { EmptyState } from "@/components/EmptyState";
import { buildAlternates } from "@/lib/seo/alternates";
import { Link } from "@/i18n/navigation";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("news"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/news", locale) };
}

export default async function NewsIndexPage() {
  const [t, tAnalysis, feed] = await Promise.all([
    getTranslations("news"),
    getTranslations("analysis"),
    getMixedNewsFeed(40),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-rf-fg">
          <Newspaper className="text-rf-news" size={22} />
          {t("title")}
        </h1>
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1.5 rounded-full border border-rf-gold/30 bg-rf-gold/10 px-3.5 py-1.5 text-sm font-semibold text-rf-gold transition-colors hover:bg-rf-gold/20"
        >
          <BarChart3 size={16} />
          {tAnalysis("title")}
          <ChevronRight size={14} />
        </Link>
      </div>

      {feed.length === 0 ? (
        <EmptyState icon={Newspaper} title={t("noArticles")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feed.map((item) =>
            item.kind === "article" ? (
              <NewsCard key={item.article.id} article={item.article} />
            ) : (
              <HeadlineCard key={item.headline.id} title={item.headline.title} sources={item.headline.sources} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
