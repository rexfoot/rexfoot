import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Rss } from "lucide-react";
import { getPublishedHeadlines } from "@/lib/data/aggregator";
import { HeadlineCard } from "@/components/HeadlineCard";
import { EmptyState } from "@/components/EmptyState";
import { buildAlternates } from "@/lib/seo/alternates";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("wire"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/wire", locale) };
}

/**
 * Vitrine de presse — agrégation de titres multi-médias, jamais le texte
 * complet d'un article (voir AggregatedHeadline dans schema.prisma). Chaque
 * carte sort de RexFoot vers le média d'origine.
 */
export default async function WirePage() {
  const [t, headlines] = await Promise.all([getTranslations("wire"), getPublishedHeadlines(40)]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-rf-fg">
        <Rss className="text-rf-news" size={22} />
        {t("title")}
      </h1>

      {headlines.length === 0 ? (
        <EmptyState icon={Rss} title={t("noHeadlines")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {headlines.map((headline) => (
            <HeadlineCard key={headline.id} title={headline.title} sources={headline.sources} />
          ))}
        </div>
      )}
    </div>
  );
}
