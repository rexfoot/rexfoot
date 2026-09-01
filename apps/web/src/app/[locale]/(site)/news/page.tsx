import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { getPublishedNews } from "@/lib/data/news";
import { NewsCard } from "@/components/NewsCard";
import { EmptyState } from "@/components/EmptyState";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Actualités",
  description: "L'actualité football internationale : transferts, résultats, analyses et interviews.",
};

export default async function NewsIndexPage() {
  const articles = await getPublishedNews(30);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Actualités</h1>

      {articles.length === 0 ? (
        <EmptyState icon={Newspaper} title="Pas encore d'actualités publiées" />
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
