import { useTranslations } from "next-intl";
import { CalendarDays, Newspaper, PlayCircle, ArrowLeftRight, Star } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { VideoCard } from "@/components/VideoCard";
import { TransferCard } from "@/components/TransferCard";
import { MatchCard } from "@/components/MatchCard";
import type { NowFeedItem as NowFeedItemData } from "@/lib/data/now-feed";

const KIND_ICON = { news: Newspaper, video: PlayCircle, transfer: ArrowLeftRight, match: CalendarDays } as const;

/** Une ligne du flux RexFoot Now — réutilise les cartes existantes, juste précédées d'une étiquette de type. */
export function NowFeedItem({ item }: { item: NowFeedItemData }) {
  const t = useTranslations("now");
  const Icon = KIND_ICON[item.kind];

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-rf-fg-subtle uppercase">
        <Icon size={13} />
        {t(`kind.${item.kind}`)}
        {item.kind === "match" && item.isFavorite && (
          <span className="ms-1 inline-flex items-center gap-1 text-rf-gold normal-case">
            <Star size={12} fill="currentColor" />
            {t("favoriteMatch")}
          </span>
        )}
      </div>

      {item.kind === "news" && <NewsCard article={item.article} />}
      {item.kind === "video" && <VideoCard video={item.video} />}
      {item.kind === "transfer" && <TransferCard transfer={item.transfer} />}
      {item.kind === "match" && <MatchCard match={item.match} />}
    </div>
  );
}
