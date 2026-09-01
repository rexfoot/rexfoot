import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlayCircle, Play, Loader2 } from "lucide-react";
import type { VideoSummary } from "@/lib/types";
import { toIntlLocale } from "@/lib/intl-locale";
import { cn } from "@/lib/cn";

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatViews(count: number, locale: string, t: ReturnType<typeof useTranslations>): string {
  if (count < 1000) return t("views", { count });
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(count);
  return t("viewsCompact", { count: compact });
}

interface VideoCardProps {
  video: VideoSummary;
  className?: string;
}

/** Carte vignette + durée + titre — état grisé/"en cours" si la vidéo n'est pas encore READY. */
export function VideoCard({ video, className }: VideoCardProps) {
  const t = useTranslations("video");
  const locale = useLocale();
  const isReady = video.status === "READY";
  const duration = formatDuration(video.durationSeconds);

  return (
    <Link
      href={`/video/${video.slug}`}
      className={cn("group block w-44 shrink-0 sm:w-56", className)}
      aria-disabled={!isReady}
    >
      <div className="relative aspect-9/16 overflow-hidden rounded-xl bg-rf-bg-card">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            unoptimized
            className={cn(
              "object-cover transition-transform",
              isReady && "group-hover:scale-105",
              !isReady && "opacity-40",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-rf-bg-elevated">
            <PlayCircle className="text-rf-fg-subtle" size={32} />
          </div>
        )}

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-xs font-medium text-rf-fg">
            <Loader2 size={14} className="animate-spin" />
            {t("processing")}
          </div>
        )}

        {isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/30">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/30 transition-transform group-hover:scale-110">
              <Play size={20} fill="currentColor" className="ms-0.5 text-white" />
            </span>
          </div>
        )}

        {duration && isReady && (
          <span className="absolute end-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-rf-fg">
            {duration}
          </span>
        )}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-medium text-rf-fg">{video.title}</h3>
      {isReady && <p className="mt-0.5 text-xs text-rf-fg-subtle">{formatViews(video.viewCount, toIntlLocale(locale), t)}</p>}
    </Link>
  );
}
