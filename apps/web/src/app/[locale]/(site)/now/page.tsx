import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Zap } from "lucide-react";
import { prisma } from "@rexfoot/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getNowFeed, type NowFeedItem as NowFeedItemData } from "@/lib/data/now-feed";
import { NowFeedItem } from "@/components/NowFeedItem";
import { EmptyState } from "@/components/EmptyState";
import { buildAlternates } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("now"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/now", locale) };
}

function itemKey(item: NowFeedItemData): string {
  switch (item.kind) {
    case "news":
      return `news-${item.article.id}`;
    case "video":
      return `video-${item.video.id}`;
    case "transfer":
      return `transfer-${item.transfer.id}`;
    case "match":
      return `match-${item.match.id}`;
  }
}

export default async function NowPage() {
  const [t, user] = await Promise.all([getTranslations("now"), getCurrentUser()]);

  let favoriteTeamIds: string[] = [];
  let favoriteCompetitionIds: string[] = [];
  if (user) {
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id, entityType: { in: ["TEAM", "COMPETITION"] } },
      select: { entityType: true, entityId: true },
    });
    favoriteTeamIds = favorites.filter((f) => f.entityType === "TEAM").map((f) => f.entityId);
    favoriteCompetitionIds = favorites.filter((f) => f.entityType === "COMPETITION").map((f) => f.entityId);
  }

  const feed = await getNowFeed(favoriteTeamIds, favoriteCompetitionIds);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-rf-fg">
          <Zap className="text-rf-gold" size={22} />
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-rf-fg-muted">{t("subtitle")}</p>
      </div>

      {feed.length === 0 ? (
        <EmptyState icon={Zap} title={t("empty")} />
      ) : (
        <div className="space-y-5">
          {feed.map((item) => (
            <NowFeedItem key={itemKey(item)} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
