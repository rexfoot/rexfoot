import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TeamCrest } from "./TeamCrest";
import { CompetitionBadge } from "./CompetitionBadge";
import type { MatchSummary } from "@/lib/types";
import { toIntlLocale } from "@/lib/intl-locale";

function formatKickoff(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

/** Carte compacte pour la liste "Autres matchs" à côté du hero — barre de progression sur la minute si en direct. */
export function LiveMatchMiniCard({ match }: { match: MatchSummary }) {
  const t = useTranslations("matches");
  const locale = useLocale();
  const isLive = match.status === "LIVE" || match.status === "HALFTIME";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const minutePercent = match.minute ? Math.min(100, Math.round((match.minute / 90) * 100)) : 0;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-xl border border-rf-border bg-rf-bg-card p-3 transition-colors hover:border-rf-gold/40"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <CompetitionBadge logoUrl={match.competition.logoUrl} name={match.competition.name} className="min-w-0 truncate" />
        {isLive ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rf-live/15 px-1.5 py-0.5 text-[10px] font-bold text-rf-live">
            <span className="h-1 w-1 animate-pulse rounded-full bg-rf-live" />
            {t("live")}
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-semibold text-rf-fg-muted">
            {match.status === "SCHEDULED" ? formatKickoff(match.kickoffAt, toIntlLocale(locale)) : t("finished")}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <TeamCrest crestUrl={match.homeTeam.crestUrl} teamName={match.homeTeam.name} size="sm" />
        <span className="font-display text-sm font-bold text-rf-fg">
          {hasScore ? `${match.homeScore} - ${match.awayScore}` : t("vs")}
        </span>
        <TeamCrest crestUrl={match.awayTeam.crestUrl} teamName={match.awayTeam.name} size="sm" />
      </div>

      {isLive && (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full bg-rf-bg-elevated">
            <div className="h-full rounded-full bg-rf-live" style={{ width: `${minutePercent}%` }} />
          </div>
          <p className="mt-1 text-end text-[10px] font-semibold text-rf-live">{match.minute ?? 0}&apos;</p>
        </div>
      )}
    </Link>
  );
}
