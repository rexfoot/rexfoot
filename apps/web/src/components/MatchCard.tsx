import { useTranslations, useLocale } from "next-intl";
import { Goal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TeamCrest } from "./TeamCrest";
import { CompetitionBadge } from "./CompetitionBadge";
import type { MatchEventSummary, MatchSummary } from "@/lib/types";
import { toIntlLocale } from "@/lib/intl-locale";
import { bestKnownMinute } from "@/lib/match-minute";
import { cn } from "@/lib/cn";

// Fuseau fixe (heure des compétitions européennes) plutôt que le fuseau local
// du visiteur : sinon le serveur (UTC) et le navigateur du visiteur affichent
// des heures différentes pour le même horaire, ce qui casse l'hydratation
// React (le HTML rendu par le serveur ne correspond plus à celui du client).
const KICKOFF_TIME_ZONE = "Europe/Paris";

function formatKickoff(iso: string, locale: string): string {
  const date = new Date(iso);
  const today = new Date();
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: KICKOFF_TIME_ZONE });
  const isToday = dayKey(date) === dayKey(today);
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: KICKOFF_TIME_ZONE });
  if (isToday) return time;
  return `${date.toLocaleDateString(locale, { day: "2-digit", month: "short", timeZone: KICKOFF_TIME_ZONE })} · ${time}`;
}

function useStatusLabel(match: MatchSummary): { label: string; isLive: boolean } {
  const t = useTranslations("matches");
  const knownMinute = bestKnownMinute(match.minute, match.events, match.kickoffAt);

  switch (match.status) {
    case "LIVE":
      return { label: knownMinute !== null ? `${knownMinute}'` : t("live"), isLive: true };
    case "HALFTIME":
      return { label: t("halftime"), isLive: true };
    case "FINISHED":
      return { label: t("finished"), isLive: false };
    case "POSTPONED":
      return { label: t("postponed"), isLive: false };
    case "CANCELLED":
      return { label: t("cancelled"), isLive: false };
    default:
      return { label: "", isLive: false };
  }
}

// Sur la carte de la home/liste, uniquement les buts (demandé par Hicham le
// 2026-09-05 : "pas toute la liste des remplacements") — cartons/remplacements
// restent réservés à la fiche match détaillée.
const GOAL_EVENT_TYPES: ReadonlySet<MatchEventSummary["type"]> = new Set(["GOAL", "PENALTY", "OWN_GOAL"]);

function formatEventMinute(minute: number, extraMinute: number | null): string {
  return extraMinute ? `${minute}+${extraMinute}'` : `${minute}'`;
}

function TeamScorers({ events, teamId, align }: { events: MatchEventSummary[]; teamId: string; align: "start" | "end" }) {
  const t = useTranslations("matches");
  const scorers = events
    .filter((e) => e.teamId === teamId && GOAL_EVENT_TYPES.has(e.type) && e.detail)
    .sort((a, b) => a.minute - b.minute);

  if (scorers.length === 0) return null;

  return (
    <ul className={cn("space-y-0.5", align === "end" ? "text-end" : "text-start")}>
      {scorers.map((event) => (
        <li
          key={event.id}
          className={cn("flex items-center gap-1 text-[11px] text-rf-fg-subtle", align === "end" && "flex-row-reverse")}
        >
          <Goal size={10} className={cn("shrink-0", event.type === "OWN_GOAL" ? "text-rf-live" : "text-rf-gold")} />
          <span className="truncate">
            {event.detail}
            {event.type === "OWN_GOAL" ? ` (${t("ownGoal")})` : ""}
          </span>
          <span className="shrink-0 text-rf-fg-subtle/70">{formatEventMinute(event.minute, event.extraMinute)}</span>
        </li>
      ))}
    </ul>
  );
}

interface MatchCardProps {
  match: MatchSummary;
  className?: string;
}

/**
 * Carte "marqueur" — blason/score/blason avec le statut au centre, buteurs en
 * petit sous le score (demandé par Hicham le 2026-09-05, remplace l'ancienne
 * carte empilée avec cartons/remplacements). Composant le plus consulté de
 * RexFoot (accueil, /matches).
 */
export function MatchCard({ match, className }: MatchCardProps) {
  const locale = useLocale();
  const { label: statusLabel, isLive } = useStatusLabel(match);
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
        {match.status === "SCHEDULED" && (
          <span className="text-xs font-semibold text-rf-fg-muted">{formatKickoff(match.kickoffAt, toIntlLocale(locale))}</span>
        )}
      </div>

      <div className="grid grid-cols-3 items-center gap-2">
        <TeamColumn name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} />
        <div className="text-center">
          {hasScore ? (
            <p className="font-display text-2xl font-extrabold text-rf-fg">
              {match.homeScore} <span className="text-rf-fg-subtle">–</span> {match.awayScore}
            </p>
          ) : (
            <p className="font-display text-lg font-bold text-rf-fg-muted">vs</p>
          )}
          {statusLabel && (
            <span
              className={cn(
                "mt-0.5 inline-flex items-center gap-1 text-xs font-bold",
                isLive ? "text-rf-live" : "text-rf-fg-subtle",
              )}
            >
              {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rf-live" />}
              {statusLabel}
            </span>
          )}
        </div>
        <TeamColumn name={match.awayTeam.name} crestUrl={match.awayTeam.crestUrl} />
      </div>

      {match.events.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-rf-border pt-2">
          <TeamScorers events={match.events} teamId={match.homeTeam.id} align="start" />
          <div />
          <TeamScorers events={match.events} teamId={match.awayTeam.id} align="end" />
        </div>
      )}
    </Link>
  );
}

function TeamColumn({ name, crestUrl }: { name: string; crestUrl: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <TeamCrest crestUrl={crestUrl} teamName={name} size="md" />
      <span className="line-clamp-2 text-xs font-medium text-rf-fg">{name}</span>
    </div>
  );
}
