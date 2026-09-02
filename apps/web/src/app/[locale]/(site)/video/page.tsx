import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Film } from "lucide-react";
import { getPublishedVideos } from "@/lib/data/videos";
import { VideoCard } from "@/components/VideoCard";
import { EmptyState } from "@/components/EmptyState";
import { buildAlternates } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("video"), getLocale()]);
  return { title: t("pageTitle"), description: t("metaDescription"), alternates: buildAlternates("/video", locale) };
}

export default async function VideoIndexPage() {
  const t = await getTranslations("video");
  const videos = await getPublishedVideos();

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-rf-fg">
        <Film className="text-rf-video" size={22} />
        {t("pageTitle")}
      </h1>

      {videos.length === 0 ? (
        <EmptyState icon={Film} title={t("noVideos")} description={t("noVideosDescription")} />
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
