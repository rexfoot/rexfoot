import { Suspense } from "react";
import { TrendingUp } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { NewsSection } from "@/components/home/NewsSection";
import { MatchesSection } from "@/components/home/MatchesSection";
import { VideoSection } from "@/components/home/VideoSection";
import { NewsSectionSkeleton, MatchesSkeleton, VideoRailSkeleton } from "@/components/home/HomeSkeletons";

// Dynamique plutôt que statique/ISR : Railway n'injecte DATABASE_URL qu'au
// runtime du conteneur, pas pendant `docker build` — un prerendering statique
// ferait planter le build faute de connexion DB disponible à ce stade.
export const dynamic = "force-dynamic";

// Chaque section a son propre composant serveur async + limite <Suspense> :
// la page streame dès que le shell est prêt, et chaque bloc affiche son
// skeleton animé (jamais de texte "chargement…") jusqu'à ce que sa requête
// Prisma résolve, indépendamment des autres sections.
export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      <section>
        <SectionHeader title="Actualités" href="/news" />
        <Suspense fallback={<NewsSectionSkeleton />}>
          <NewsSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader title="🔥 RexFoot Video" href="/video" />
        <Suspense fallback={<VideoRailSkeleton />}>
          <VideoSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader title="Matchs du jour" href="/matches" />
        <Suspense fallback={<MatchesSkeleton />}>
          <MatchesSection />
        </Suspense>
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
