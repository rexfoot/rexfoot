import { getTranslations } from "next-intl/server";
import { Tv, ExternalLink } from "lucide-react";
import { VideoCard } from "@/components/VideoCard";
import type { VideoSummary } from "@/lib/types";

/** FIFA+ : matchs en direct gratuits (certaines compétitions) + archives — lien officiel stable, sans maintenance. */
const FIFA_PLUS_URL = "https://www.fifa.com/fifaplus/";

/**
 * "Où regarder — gratuit et légal" sur la page détail d'un match.
 * 100 % automatique, zéro maintenance : résumés liés (quand la chaîne
 * YouTube synchronisée en a), lien FIFA+ (directs gratuits selon
 * compétitions), et rappel honnête que le suivi live RexFoot est texte
 * uniquement — jamais de stream illégal.
 */
export async function WatchFreeBlock({ videos }: { videos: VideoSummary[] }) {
  const t = await getTranslations("matches");

  return (
    <section aria-label={t("watchFreeTitle")} className="rounded-2xl border border-rf-border bg-rf-bg-card p-4">
      <h2 className="flex items-center gap-2 font-display text-base font-bold text-rf-fg">
        <Tv size={18} className="text-rf-gold" />
        {t("watchFreeTitle")}
      </h2>

      {videos.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium text-rf-fg-muted">{t("watchFreeHighlights")}</p>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      )}

      <a
        href={FIFA_PLUS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-rf-border px-3.5 py-2.5 transition-colors hover:border-rf-gold/40"
      >
        <span>
          <span className="block text-sm font-bold text-rf-fg">{t("watchFreeFifaPlus")}</span>
          <span className="block text-xs text-rf-fg-muted">{t("watchFreeFifaPlusDesc")}</span>
        </span>
        <ExternalLink size={16} className="shrink-0 text-rf-fg-subtle" />
      </a>

      <p className="mt-3 text-xs text-rf-fg-subtle">{t("watchFreeNote")}</p>
    </section>
  );
}
