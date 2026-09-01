import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/SectionHeader";
import { NewsSection } from "@/components/home/NewsSection";
import { MatchesHeroSection } from "@/components/home/MatchesHeroSection";
import { VideoSection } from "@/components/home/VideoSection";
import { TrendingSection } from "@/components/home/TrendingSection";
import {
  NewsSectionSkeleton,
  MatchesHeroSkeleton,
  VideoRailSkeleton,
  TrendingSkeleton,
} from "@/components/home/HomeSkeletons";

// Dynamique plutôt que statique/ISR : Railway n'injecte DATABASE_URL qu'au
// runtime du conteneur, pas pendant `docker build` — un prerendering statique
// ferait planter le build faute de connexion DB disponible à ce stade.
export const dynamic = "force-dynamic";

// Chaque section a son propre composant serveur async + limite <Suspense> :
// la page streame dès que le shell est prêt, et chaque bloc affiche son
// skeleton animé (jamais de texte "chargement…") jusqu'à ce que sa requête
// Prisma résolve, indépendamment des autres sections.
export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      <section>
        <SectionHeader title={t("matchesTitle")} href="/matches" />
        <Suspense fallback={<MatchesHeroSkeleton />}>
          <MatchesHeroSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader title={t("newsTitle")} href="/news" />
        <Suspense fallback={<NewsSectionSkeleton />}>
          <NewsSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader title={`🔥 ${t("videoTitle")}`} href="/video" />
        <Suspense fallback={<VideoRailSkeleton />}>
          <VideoSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader title={t("trendingTitle")} />
        <Suspense fallback={<TrendingSkeleton />}>
          <TrendingSection />
        </Suspense>
      </section>
    </div>
  );
}
