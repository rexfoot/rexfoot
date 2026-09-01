"use client";

import { useRef } from "react";
import { Film, ChevronLeft, ChevronRight } from "lucide-react";
import { VideoCard } from "./VideoCard";
import { EmptyState } from "./EmptyState";
import type { VideoSummary } from "@/lib/types";

interface VideoRailProps {
  videos: VideoSummary[];
}

/** Carrousel horizontal de vidéos — section "🔥 RexFoot Video" de la page d'accueil. */
export function VideoRail({ videos }: VideoRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (videos.length === 0) {
    return (
      <EmptyState
        icon={Film}
        title="Pas encore de vidéos"
        description="Les premières vidéos RexFoot (highlights, interviews, buts) apparaîtront ici."
      />
    );
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

      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Défiler vers la gauche"
        className="absolute top-0 bottom-8 left-0 hidden w-10 items-center justify-center bg-gradient-to-r from-rf-bg to-transparent opacity-0 transition-opacity group-hover/rail:opacity-100 sm:flex"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rf-bg-elevated text-rf-fg ring-1 ring-rf-border">
          <ChevronLeft size={18} />
        </span>
      </button>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Défiler vers la droite"
        className="absolute top-0 right-0 bottom-8 hidden w-10 items-center justify-center bg-gradient-to-l from-rf-bg to-transparent opacity-0 transition-opacity group-hover/rail:opacity-100 sm:flex"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rf-bg-elevated text-rf-fg ring-1 ring-rf-border">
          <ChevronRight size={18} />
        </span>
      </button>
    </div>
  );
}
