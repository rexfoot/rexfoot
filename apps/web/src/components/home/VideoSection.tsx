import { getPublishedVideos } from "@/lib/data/videos";
import { VideoRail } from "@/components/VideoRail";

/** Highlights vidéo — fetch isolé pour streamer indépendamment des autres sections. */
export async function VideoSection() {
  const videos = await getPublishedVideos(10);
  return <VideoRail videos={videos} />;
}
