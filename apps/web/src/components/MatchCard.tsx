import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TeamCrest } from "./TeamCrest";
import { CompetitionBadge } from "./CompetitionBadge";
import type { MatchSummary } from "@/lib/types";
import { toIntlLocale } from "@/lib/intl-locale";
import { cn } from "@/lib/cn";

function formatKickoff(iso: string, locale: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  return `${date.toLocaleDateString(locale, { day: "2-digit", month: "short" })} · ${time}`;
}

function StatusBadge({ status, minute }: { status: MatchSummary["status"]; minute: number | null }) {
  const t = useTranslations("matches");

  switch (status) {
    case "LIVE":
    case "HALFTIME":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rf-live/15 px-2 py-0.5 text-xs font-bold text-rf-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rf-live" />
          {status === "HALFTIME" ? t("halftime") : `${minute ?? 0}'`}
        </span>
      );
    case "FINISHED":
      return <span className="text-xs font-semibold text-rf-fg-subtle">{t("finished")}</span>;
    case "POSTPONED":
      return <span className="text-xs font-semibold text-rf-fg-subtle">{t("postponed")}</span>;
    case "CANCELLED":
      return <span className="text-xs font-semibold text-rf-fg-subtle">{t("cancelled")}</span>;
    default:
      return null;
  }
}

interface MatchCardProps {
  match: MatchSummary;
  className?: string;
}

/** Carte compacte score/statut — le composant le plus consulté de RexFoot (accueil, /matches). */
export function MatchCard({ match, className }: MatchCardProps) {
  const locale = useLocale();
  const isLive = match.status === "LIVE" || match.status === "HALFTIME";
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "block rounded-2xl border bg-rf-bg-card p-4 transition-colors hover:border-rf-gold/40",
        isLive ? "border-rf-live/30" : "border-rf-border",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <CompetitionBadge logoUrl={match.competition.logoUrl} name={match.competition.name} />
        {match.status === "SCHEDULED" ? (
          <span className="text-xs font-semibold text-rf-fg-muted">
            {formatKickoff(match.kickoffAt, toIntlLocale(locale))}
          </span>
        ) : (
          <StatusBadge status={match.status} minute={match.minute} />
        )}
      </div>

      <div className="space-y-2">
        <TeamRow name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} score={hasScore ? match.homeScore : null} />
        <TeamRow name={match.awayTeam.name} crestUrl={match.awayTeam.crestUrl} score={hasScore ? match.awayScore : null} />
      </div>
    </Link>
  );
}

function TeamRow({ name, crestUrl, score }: { name: string; crestUrl: string | null; score: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 truncate text-sm font-medium text-rf-fg">
        <TeamCrest crestUrl={crestUrl} teamName={name} size="sm" />
        <span className="truncate">{name}</span>
      </span>
      {score !== null && <span className="font-display text-base font-bold text-rf-fg">{score}</span>}
    </div>
  );
}
