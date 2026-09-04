import { useTranslations, useLocale } from "next-intl";
import { Goal, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TeamCrest } from "./TeamCrest";
import { CompetitionBadge } from "./CompetitionBadge";
import type { MatchEventSummary, MatchSummary } from "@/lib/types";
import { toIntlLocale } from "@/lib/intl-locale";
import { bestKnownMinute } from "@/lib/match-minute";
import { cn } from "@/lib/cn";

function formatKickoff(iso: string, locale: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  return `${date.toLocaleDateString(locale, { day: "2-digit", month: "short" })} · ${time}`;
}

function StatusBadge({
  status,
  minute,
  events,
}: {
  status: MatchSummary["status"];
  minute: number | null;
  events: MatchEventSummary[];
}) {
  const t = useTranslations("matches");
  const knownMinute = bestKnownMinute(minute, events);

  switch (status) {
    case "LIVE":
    case "HALFTIME": {
      const label = status === "HALFTIME" ? t("halftime") : knownMinute !== null ? `${knownMinute}'` : t("live");
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rf-live/15 px-2 py-0.5 text-xs font-bold text-rf-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rf-live" />
          {label}
        </span>
      );
    }
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

// Types qu'on sait représenter en badge compact — VAR et penalty manqué sont
// volontairement omis (peu d'intérêt sur une carte aussi compacte).
const RENDERABLE_EVENT_TYPES: ReadonlySet<MatchEventSummary["type"]> = new Set([
  "GOAL",
  "PENALTY",
  "OWN_GOAL",
  "YELLOW_CARD",
  "RED_CARD",
  "SUBSTITUTION",
]);

function formatEventMinute(minute: number, extraMinute: number | null): string {
  return extraMinute ? `${minute}+${extraMinute}'` : `${minute}'`;
}

function EventChip({ event }: { event: MatchEventSummary }) {
  const t = useTranslations("matches");
  const minuteLabel = formatEventMinute(event.minute, event.extraMinute);

  switch (event.type) {
    case "GOAL":
    case "PENALTY":
      if (!event.detail) return null;
      return (
        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-rf-fg-subtle" title={`${t("goal")} · ${minuteLabel}`}>
          <Goal size={12} className="shrink-0 text-rf-gold" />
          <span className="truncate">{event.detail}</span>
          <span className="shrink-0 text-rf-fg-subtle/70">{minuteLabel}</span>
        </span>
      );
    case "OWN_GOAL":
      if (!event.detail) return null;
      return (
        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-rf-fg-subtle" title={`${t("ownGoal")} · ${minuteLabel}`}>
          <Goal size={12} className="shrink-0 text-rf-live" />
          <span className="truncate">{event.detail}</span>
          <span className="shrink-0 text-rf-fg-subtle/70">{minuteLabel}</span>
        </span>
      );
    case "YELLOW_CARD":
      if (!event.detail) return null;
      return (
        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-rf-fg-subtle" title={`${t("yellowCard")} · ${minuteLabel}`}>
          <span className="h-2.5 w-2 shrink-0 rounded-[1px] bg-yellow-400" />
          <span className="truncate">{event.detail}</span>
        </span>
      );
    case "RED_CARD":
      if (!event.detail) return null;
      return (
        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-rf-fg-subtle" title={`${t("redCard")} · ${minuteLabel}`}>
          <span className="h-2.5 w-2 shrink-0 rounded-[1px] bg-red-500" />
          <span className="truncate">{event.detail}</span>
        </span>
      );
    case "SUBSTITUTION":
      return (
        <span className="inline-flex min-w-0 items-center gap-2 text-[11px] text-rf-fg-subtle" title={`${t("substitution")} · ${minuteLabel}`}>
          {event.detail && (
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <ArrowUpCircle size={12} className="shrink-0 text-green-500" />
              <span className="truncate">{event.detail}</span>
            </span>
          )}
          {event.detailOut && (
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <ArrowDownCircle size={12} className="shrink-0 text-red-500" />
              <span className="truncate">{event.detailOut}</span>
            </span>
          )}
        </span>
      );
    default:
      return null;
  }
}

/** Badges but/carton/remplacement pour une équipe, alignés sous son nom (voir ms-7 = largeur écusson "sm" + gap-2 dans TeamRow). */
function TeamEvents({ events }: { events: MatchEventSummary[] }) {
  const renderable = events.filter((e) => RENDERABLE_EVENT_TYPES.has(e.type));
  if (renderable.length === 0) return null;

  return (
    <div className="ms-7 flex flex-wrap gap-x-2.5 gap-y-0.5">
      {renderable.map((event) => (
        <EventChip key={event.id} event={event} />
      ))}
    </div>
  );
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
  const homeEvents = match.events.filter((e) => e.teamId === match.homeTeam.id);
  const awayEvents = match.events.filter((e) => e.teamId === match.awayTeam.id);

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
          <StatusBadge status={match.status} minute={match.minute} events={match.events} />
        )}
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <TeamRow name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} score={hasScore ? match.homeScore : null} />
          <TeamEvents events={homeEvents} />
        </div>
        <div className="space-y-1">
          <TeamRow name={match.awayTeam.name} crestUrl={match.awayTeam.crestUrl} score={hasScore ? match.awayScore : null} />
          <TeamEvents events={awayEvents} />
        </div>
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
