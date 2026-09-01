"use client";

import { ListChecks } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { TeamCrest } from "./TeamCrest";
import { CompetitionBadge } from "./CompetitionBadge";
import { EmptyState } from "./EmptyState";
import { MatchVotePanel } from "./MatchVotePanel";
import { ShareButtons } from "./ShareButtons";
import { useMatchDetail } from "@/hooks/useMatchDetail";
import { toIntlLocale } from "@/lib/intl-locale";
import type { MatchDetail } from "@/lib/types";

const EVENT_ICON: Record<string, string> = {
  GOAL: "⚽",
  OWN_GOAL: "⚽",
  PENALTY: "⚽",
  MISSED_PENALTY: "❌",
  YELLOW_CARD: "🟨",
  RED_CARD: "🟥",
  SUBSTITUTION: "🔄",
  VAR: "📺",
};

function useStatusLabel(match: MatchDetail): string {
  const t = useTranslations("matches");
  const locale = useLocale();

  switch (match.status) {
    case "LIVE":
      return `${match.minute ?? 0}' — ${t("live")}`;
    case "HALFTIME":
      return t("halftime");
    case "FINISHED":
      return t("finished");
    case "POSTPONED":
      return t("postponed");
    case "CANCELLED":
      return t("cancelled");
    default:
      return new Date(match.kickoffAt).toLocaleString(toIntlLocale(locale), { dateStyle: "long", timeStyle: "short" });
  }
}

export function MatchDetailClient({ matchId, initialMatch }: { matchId: string; initialMatch: MatchDetail }) {
  const t = useTranslations("matches");
  const match = useMatchDetail(matchId, initialMatch);
  const statusLabel = useStatusLabel(match);
  const isLive = match.status === "LIVE" || match.status === "HALFTIME";
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-rf-border bg-rf-bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <CompetitionBadge logoUrl={match.competition.logoUrl} name={match.competition.name} />
          {match.round && <span className="text-xs text-rf-fg-subtle">{match.round}</span>}
        </div>

        <div className="grid grid-cols-3 items-center gap-4">
          <TeamColumn name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} />
          <div className="text-center">
            {hasScore ? (
              <p className="font-display text-4xl font-extrabold text-rf-fg">
                {match.homeScore} <span className="text-rf-fg-subtle">–</span> {match.awayScore}
              </p>
            ) : (
              <p className="font-display text-2xl font-bold text-rf-fg-muted">{t("vs")}</p>
            )}
            <p className={`mt-2 text-sm font-semibold ${isLive ? "text-rf-live" : "text-rf-fg-muted"}`}>{statusLabel}</p>
          </div>
          <TeamColumn name={match.awayTeam.name} crestUrl={match.awayTeam.crestUrl} />
        </div>

        <div className="mt-6 border-t border-rf-border pt-5">
          <MatchVotePanel matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
        </div>

        <div className="mt-5 border-t border-rf-border pt-5">
          <ShareButtons title={`${match.homeTeam.name} vs ${match.awayTeam.name}`} />
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-rf-fg">{t("events")}</h2>
        {match.events.length === 0 ? (
          <EmptyState icon={ListChecks} title={t("noEvents")} />
        ) : (
          <ol className="space-y-2">
            {match.events.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-xl border border-rf-border bg-rf-bg-card px-4 py-2.5 text-sm"
              >
                <span className="w-10 shrink-0 text-end font-display font-semibold text-rf-fg-muted">
                  {event.minute}
                  {event.extraMinute ? `+${event.extraMinute}` : ""}&apos;
                </span>
                <span aria-hidden>{EVENT_ICON[event.type] ?? "•"}</span>
                <TeamCrest crestUrl={event.team.crestUrl} teamName={event.team.name} size="sm" />
                <span className="text-rf-fg">{event.player?.displayName ?? event.detail ?? event.type}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function TeamColumn({ name, crestUrl }: { name: string; crestUrl: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamCrest crestUrl={crestUrl} teamName={name} size="lg" />
      <span className="text-sm font-medium text-rf-fg">{name}</span>
    </div>
  );
}
