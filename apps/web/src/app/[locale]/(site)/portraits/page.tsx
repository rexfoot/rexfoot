import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { getPortraitArticles } from "@/lib/data/news";
import { NewsCard } from "@/components/NewsCard";
import { EmptyState } from "@/components/EmptyState";
import { buildAlternates } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("portraits"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/portraits", locale) };
}

export default async function PortraitsIndexPage() {
  const [t, articles] = await Promise.all([getTranslations("portraits"), getPortraitArticles(30)]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>
        <p className="mt-1 text-sm text-rf-fg-muted">{t("subtitle")}</p>
      </div>

      {articles.length === 0 ? (
        <EmptyState icon={Star} title={t("noArticles")} description={t("noArticlesDescription")} />
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
