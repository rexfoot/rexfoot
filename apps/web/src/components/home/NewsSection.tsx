import { Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPublishedNews, getMixedNewsFeed } from "@/lib/data/news";
import { NewsHero } from "@/components/NewsHero";
import { NewsCard } from "@/components/NewsCard";
import { HeadlineCard } from "@/components/HeadlineCard";
import { EmptyState } from "@/components/EmptyState";

/**
 * Une (hero, toujours un article original RexFoot — NewsHero exige un slug
 * interne qu'une headline du kiosque n'a pas) + grille mélangeant articles ET
 * titres du kiosque triés par date (voir getMixedNewsFeed) — demande explicite
 * de Hicham (2026-09-17) : plus de page/section séparée pour le kiosque, tout
 * vit dans "Actualités". Fetch isolé pour streamer indépendamment des autres
 * sections de la page d'accueil.
 */
export async function NewsSection() {
  const [hero, feed, t] = await Promise.all([getPublishedNews(1), getMixedNewsFeed(9), getTranslations("news")]);

  if (hero.length === 0) {
    return <EmptyState icon={Newspaper} title={t("noArticles")} />;
  }

  const rest = feed.filter((item) => item.kind !== "article" || item.article.id !== hero[0].id);

  return (
    <div className="space-y-4">
      <NewsHero article={hero[0]} />
      {rest.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((item) =>
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
