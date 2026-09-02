import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Zap, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
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
      <Link
        href="/now"
        className="rf-now-pulse group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-rf-orange/50 bg-gradient-to-r from-rf-orange/25 via-rf-orange/10 to-transparent px-4 py-4 transition-transform hover:scale-[1.01]"
      >
        <span className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rf-orange opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rf-orange" />
          </span>
          <span className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-rf-orange">
            <Zap size={20} className="shrink-0" fill="currentColor" />
            {t("nowTitle")}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-rf-orange px-3 py-1.5 text-sm font-bold text-rf-bg transition-transform group-hover:translate-x-0.5">
          {t("nowCta")}
          <ChevronRight size={16} className="rtl:rotate-180" />
        </span>
      </Link>

      <section>
        <SectionHeader title={t("matchesTitle")} href="/matches" accent="matches" />
        <Suspense fallback={<MatchesHeroSkeleton />}>
          <MatchesHeroSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader title={t("newsTitle")} href="/news" accent="news" />
        <Suspense fallback={<NewsSectionSkeleton />}>
          <NewsSection />
        </Suspense>
      </section>

      <section>
        <SectionHeader title={t("videoTitle")} href="/video" accent="video" />
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
