import type { Metadata } from "next";
import { Film } from "lucide-react";
import { getPublishedVideos } from "@/lib/data/videos";
import { VideoCard } from "@/components/VideoCard";
import { EmptyState } from "@/components/EmptyState";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Vidéo",
  description: "Highlights, résumés, buts, interviews et actualités football en vidéo sur RexFoot.",
};

export default async function VideoIndexPage() {
  const videos = await getPublishedVideos();

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">RexFoot Video</h1>

      {videos.length === 0 ? (
        <EmptyState
          icon={Film}
          title="Pas encore de vidéos publiées"
          description="Highlights, interviews et résumés de match arriveront ici prochainement."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} className="w-full" />
          ))}
        </div>
      )}
    </div>
  );
}
