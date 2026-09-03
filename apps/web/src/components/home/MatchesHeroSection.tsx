import { getTranslations } from "next-intl/server";
import { CalendarX } from "lucide-react";
import { getMatchesOfTheDay } from "@/lib/data/matches";
import { MatchesListClient } from "@/components/MatchesListClient";
import { EmptyState } from "@/components/EmptyState";

/** Matchs du jour, un sous l'autre, résultats en direct — fetch isolé pour streamer indépendamment des autres sections. */
export async function MatchesHeroSection() {
  const t = await getTranslations("matches");
  const matches = await getMatchesOfTheDay();

  if (matches.length === 0) {
    return <EmptyState icon={CalendarX} title={t("noMatchesTodayTitle")} description={t("noMatchesTodayDescription")} />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const apiParams = new URLSearchParams({ date: today.toISOString() });

  return (
    <MatchesListClient
      apiUrl={`/api/matches?${apiParams.toString()}`}
      initialMatches={matches}
      emptyTitle={t("noMatchesTodayTitle")}
      listClassName="grid-cols-1 gap-3"
    />
  );
}
