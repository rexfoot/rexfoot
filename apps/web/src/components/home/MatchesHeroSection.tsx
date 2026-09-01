import { getTranslations } from "next-intl/server";
import { CalendarX } from "lucide-react";
import { getFeaturedMatch, getMatchesOfTheDay } from "@/lib/data/matches";
import { MatchHero } from "@/components/MatchHero";
import { LiveMatchMiniCard } from "@/components/LiveMatchMiniCard";
import { EmptyState } from "@/components/EmptyState";

/** Match vedette + autres matchs du jour — fetch isolé pour streamer indépendamment des autres sections. */
export async function MatchesHeroSection() {
  const t = await getTranslations("matches");
  const [featured, todayMatches] = await Promise.all([getFeaturedMatch(), getMatchesOfTheDay()]);

  if (!featured) {
    return <EmptyState icon={CalendarX} title={t("noMatchesTodayTitle")} description={t("noMatchesTodayDescription")} />;
  }

  const otherMatches = todayMatches.filter((match) => match.id !== featured.id).slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <MatchHero initialMatch={featured} />
      </div>
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold tracking-wide text-rf-fg-muted uppercase">
          {t("otherMatchesToday")}
        </h3>
        {otherMatches.length === 0 ? (
          <p className="text-sm text-rf-fg-subtle">{t("noOtherMatches")}</p>
        ) : (
          <div className="space-y-2">
            {otherMatches.map((match) => (
              <LiveMatchMiniCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
