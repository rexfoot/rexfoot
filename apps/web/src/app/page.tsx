import { TrendingUp } from "lucide-react";
import { getMatchesOfTheDay } from "@/lib/data/matches";
import { getPublishedVideos } from "@/lib/data/videos";
import { getPublishedNews } from "@/lib/data/news";
import { SectionHeader } from "@/components/SectionHeader";
import { VideoRail } from "@/components/VideoRail";
import { MatchesListClient } from "@/components/MatchesListClient";
import { EmptyState } from "@/components/EmptyState";
import { NewsCard } from "@/components/NewsCard";

export const revalidate = 60;

export default async function HomePage() {
  const todayIso = new Date().toISOString();
  const [matches, videos, news] = await Promise.all([
    getMatchesOfTheDay(),
    getPublishedVideos(10),
    getPublishedNews(6),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      <section>
        <SectionHeader title="🔥 RexFoot Video" href="/video" />
        <VideoRail videos={videos} />
      </section>

      <section>
        <SectionHeader title="Matchs du jour" href="/matches" />
        <MatchesListClient
          apiUrl={`/api/matches?date=${encodeURIComponent(todayIso)}`}
          initialMatches={matches}
          emptyTitle="Aucun match aujourd'hui"
          emptyDescription="Reviens plus tard, ou consulte le calendrier complet des compétitions."
        />
      </section>

      <section>
        <SectionHeader title="Actualités" href="/news" />
        {news.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Pas encore d'actualités publiées" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Tendances" />
        <EmptyState
          icon={TrendingUp}
          title="Les tendances arrivent bientôt"
          description="Cette section mettra en avant les contenus les plus suivis dès que RexFoot aura du trafic à analyser."
        />
      </section>
    </div>
  );
}
