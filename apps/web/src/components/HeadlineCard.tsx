import Image from "next/image";
import { useTranslations } from "next-intl";
import { Rss, ExternalLink } from "lucide-react";

interface HeadlineSource {
  id: string;
  publisherName: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

interface HeadlineCardProps {
  title: string;
  sources: HeadlineSource[];
}

/**
 * Vitrine de presse (voir AggregatedHeadline) — jamais un lien interne : le
 * clic sort toujours vers le média d'origine, RexFoot n'affiche que
 * titre/vignette officielle/nom du média (voir aggregateHeadlines.ts).
 */
export function HeadlineCard({ title, sources }: HeadlineCardProps) {
  const t = useTranslations("wire");
  const withThumbnail = sources.find((s) => s.thumbnailUrl);

  return (
    <div className="overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card">
      <a
        href={sources[0]?.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
        title={t("readOn", { source: sources[0]?.publisherName ?? "" })}
      >
        <div className="relative aspect-video overflow-hidden bg-rf-bg-elevated">
          {withThumbnail?.thumbnailUrl ? (
            <Image
              src={withThumbnail.thumbnailUrl}
              alt=""
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Rss className="text-rf-fg-subtle" size={22} />
            </div>
          )}
        </div>
        <p className="p-3 pb-1.5 font-medium text-rf-fg group-hover:text-rf-gold">{title}</p>
      </a>

      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-rf-border px-2 py-0.5 text-xs font-medium text-rf-fg-muted transition-colors hover:border-rf-gold/40 hover:text-rf-gold"
          >
            {source.publisherName}
            <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>
  );
}
