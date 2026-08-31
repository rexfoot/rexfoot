import { Film } from "lucide-react";
import { VideoCard } from "./VideoCard";
import { EmptyState } from "./EmptyState";
import type { VideoSummary } from "@/lib/types";

interface VideoRailProps {
  videos: VideoSummary[];
}

/** Rail horizontal de vidéos — section "🔥 RexFoot Video" de la page d'accueil. */
export function VideoRail({ videos }: VideoRailProps) {
  if (videos.length === 0) {
    return (
      <EmptyState
        icon={Film}
        title="Pas encore de vidéos"
        description="Les premières vidéos RexFoot (highlights, interviews, buts) apparaîtront ici."
      />
    );
  }

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
