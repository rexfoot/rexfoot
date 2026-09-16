import { Rss } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPublishedHeadlines } from "@/lib/data/aggregator";
import { HeadlineCard } from "@/components/HeadlineCard";
import { EmptyState } from "@/components/EmptyState";

/** Aperçu du kiosque (agrégateur multi-médias) sur la page d'accueil — voir /wire pour la liste complète. */
export async function WireSection() {
  const [headlines, t] = await Promise.all([getPublishedHeadlines(6), getTranslations("wire")]);

  if (headlines.length === 0) {
    return <EmptyState icon={Rss} title={t("noHeadlines")} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {headlines.map((headline) => (
        <HeadlineCard key={headline.id} title={headline.title} sources={headline.sources} />
      ))}
    </div>
  );
}
