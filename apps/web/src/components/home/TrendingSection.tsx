import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { TrendingUp, Newspaper, PlayCircle, Shield, User, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTrending, type TrendingItem } from "@/lib/data/trending";
import { EmptyState } from "@/components/EmptyState";

const TYPE_ICON = { ARTICLE: Newspaper, VIDEO: PlayCircle, TEAM: Shield, PLAYER: User, TALENT_PROFILE: Star } as const;

/** Contenus les plus consultés sur 7 jours — jamais affiché tant qu'il n'y a pas de vraies vues (section 19 du plan). */
export async function TrendingSection() {
  const [items, t, tHome] = await Promise.all([
    getTrending(),
    getTranslations("trending"),
    getTranslations("home"),
  ]);

  const labelByType: Record<TrendingItem["type"], string> = {
    ARTICLE: t("topArticle"),
    VIDEO: t("topVideo"),
    TEAM: t("topTeam"),
    PLAYER: t("topPlayer"),
    TALENT_PROFILE: t("topTalent"),
  };

  if (items.length === 0) {
    return (
      <EmptyState icon={TrendingUp} title={tHome("trendingEmptyTitle")} description={tHome("trendingEmptyDescription")} />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = TYPE_ICON[item.type];
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-3 rounded-2xl border border-rf-border bg-rf-bg-card p-3 transition-colors hover:border-rf-gold/40"
          >
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-rf-bg-elevated">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill unoptimized className="object-cover" />
              ) : (
                <Icon size={20} className="text-rf-fg-subtle" />
              )}
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-rf-gold uppercase">
                <TrendingUp size={12} />
                {labelByType[item.type]}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-rf-fg">{item.title}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
