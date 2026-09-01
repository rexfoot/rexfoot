"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Film, ChevronLeft, ChevronRight } from "lucide-react";
import { VideoCard } from "./VideoCard";
import { EmptyState } from "./EmptyState";
import type { VideoSummary } from "@/lib/types";

interface VideoRailProps {
  videos: VideoSummary[];
}

/** Carrousel horizontal de vidéos — section "🔥 RexFoot Video" de la page d'accueil. */
export function VideoRail({ videos }: VideoRailProps) {
  const t = useTranslations("video");
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (videos.length === 0) {
    return <EmptyState icon={Film} title={t("noVideosRail")} description={t("noVideosRailDescription")} />;
  }

  function scrollBy(direction: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  return (
    <div className="group/rail relative">
      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} className="snap-start" />
        ))}
      </div>

      {/*
        Positions et flèches restent volontairement en left-0/right-0 absolus
        (pas start-/end- logiques) : `scrollBy` déplace toujours le viewport
        vers l'écran physique gauche/droite quel que soit `dir`, donc faire
        pivoter les chevrons en RTL sans changer leur position casserait la
        cohérence flèche ↔ direction réelle du scroll.
      */}
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label={t("scrollLeft")}
        className="absolute top-0 bottom-8 left-0 hidden w-10 items-center justify-center bg-gradient-to-r from-rf-bg to-transparent opacity-0 transition-opacity group-hover/rail:opacity-100 sm:flex"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rf-bg-elevated text-rf-fg ring-1 ring-rf-border">
          <ChevronLeft size={18} />
        </span>
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label={t("scrollRight")}
        className="absolute top-0 right-0 bottom-8 hidden w-10 items-center justify-center bg-gradient-to-l from-rf-bg to-transparent opacity-0 transition-opacity group-hover/rail:opacity-100 sm:flex"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rf-bg-elevated text-rf-fg ring-1 ring-rf-border">
          <ChevronRight size={18} />
        </span>
      </button>
    </div>
  );
}
