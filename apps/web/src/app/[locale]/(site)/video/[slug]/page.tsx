import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Loader2 } from "lucide-react";
import { getRelatedVideos, getVideoBySlug } from "@/lib/data/videos";
import { VideoCard } from "@/components/VideoCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TrackView } from "@/components/TrackView";
import { buildAlternates } from "@/lib/seo/alternates";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [video, t, locale] = await Promise.all([getVideoBySlug(slug), getTranslations("video"), getLocale()]);
  if (!video) return {};
  return {
    title: video.title,
    description: video.description ?? t("metaFallbackDescription", { title: video.title }),
    openGraph: video.thumbnailUrl ? { images: [{ url: video.thumbnailUrl }] } : undefined,
    alternates: buildAlternates(`/video/${slug}`, locale),
  };
}

export default async function VideoDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("video");
  const video = await getVideoBySlug(slug);
  if (!video) notFound();

  const related = await getRelatedVideos(video.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <TrackView entityType="VIDEO" entityId={video.id} />
      <div className="overflow-hidden rounded-2xl bg-rf-bg-card">
        {video.playbackUrl ? (
          <iframe
            src={video.playbackUrl}
            title={video.title}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            className="aspect-video w-full border-0"
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-rf-fg-muted">
            <Loader2 className="animate-spin" size={28} />
            <p className="text-sm">{t("processingMessage")}</p>
          </div>
        )}
      </div>

      <div>
        <h1 className="font-display text-xl font-bold text-rf-fg">{video.title}</h1>
        {video.description && <p className="mt-2 text-sm text-rf-fg-muted">{video.description}</p>}
        <p className="mt-2 text-xs text-rf-fg-subtle">{t("views", { count: video.viewCount })}</p>
      </div>

      {related.length > 0 && (
        <section>
          <SectionHeader title={t("relatedTitle")} />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {related.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
