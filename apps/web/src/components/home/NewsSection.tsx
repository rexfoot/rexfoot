import { Newspaper } from "lucide-react";
import { getPublishedNews } from "@/lib/data/news";
import { NewsHero } from "@/components/NewsHero";
import { NewsCard } from "@/components/NewsCard";
import { EmptyState } from "@/components/EmptyState";

/** Une (hero) + grille d'actualités — fetch isolé pour streamer indépendamment des autres sections. */
export async function NewsSection() {
  const articles = await getPublishedNews(7);

  if (articles.length === 0) {
    return <EmptyState icon={Newspaper} title="Pas encore d'actualités publiées" />;
  }

  const [hero, ...rest] = articles;

  return (
    <div className="space-y-4">
      <NewsHero article={hero} />
      {rest.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
