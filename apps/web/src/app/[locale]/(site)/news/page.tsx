import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Newspaper, BarChart3, ChevronRight } from "lucide-react";
import { getPublishedNews } from "@/lib/data/news";
import { NewsCard } from "@/components/NewsCard";
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
  const [t, tAnalysis, articles] = await Promise.all([
    getTranslations("news"),
    getTranslations("analysis"),
    getPublishedNews(30),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1.5 rounded-full border border-rf-gold/30 bg-rf-gold/10 px-3.5 py-1.5 text-sm font-semibold text-rf-gold transition-colors hover:bg-rf-gold/20"
        >
          <BarChart3 size={16} />
          {tAnalysis("title")}
          <ChevronRight size={14} />
        </Link>
      </div>

      {articles.length === 0 ? (
        <EmptyState icon={Newspaper} title={t("noArticles")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
