"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { TeamCrest } from "./TeamCrest";
import { CompetitionBadge } from "./CompetitionBadge";
import { MatchVotePanel } from "./MatchVotePanel";
import { useMatch } from "@/hooks/useMatch";
import type { MatchSummary } from "@/lib/types";

function useCountdown(target: string | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!target) return;
    // Le premier tick arrive après 1s (pas d'appel synchrone dans l'effet) —
    // le fallback date/heure s'affiche brièvement le temps du premier intervalle.
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(target).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function CountdownDisplay({ ms }: { ms: number }) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="flex items-center justify-center gap-1.5 [font-variant-numeric:tabular-nums]">
      <TimeUnit value={days} unit="j" />
      <span className="pb-3 text-rf-fg-subtle">:</span>
      <TimeUnit value={hours} unit="h" />
      <span className="pb-3 text-rf-fg-subtle">:</span>
      <TimeUnit value={minutes} unit="m" />
      <span className="pb-3 text-rf-fg-subtle">:</span>
      <TimeUnit value={seconds} unit="s" />
    </div>
  );
}

function TimeUnit({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="font-display text-lg font-bold text-rf-gold sm:text-xl">{pad(value)}</span>
      <span className="text-[9px] font-medium text-rf-fg-subtle uppercase">{unit}</span>
    </span>
  );
}

interface MatchHeroProps {
  initialMatch: MatchSummary;
}

/** Match mis en avant sur l'accueil — score/minute en direct, compte à rebours avant coup d'envoi, pronostic. */
export function MatchHero({ initialMatch }: MatchHeroProps) {
  const match = useMatch(initialMatch.id, initialMatch);
  const isLive = match.status === "LIVE" || match.status === "HALFTIME";
  const isScheduled = match.status === "SCHEDULED";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const countdown = useCountdown(isScheduled ? match.kickoffAt : null);

  return (
    <div className="rounded-2xl border border-rf-border bg-rf-bg-card p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rf-live/15 px-2.5 py-1 text-xs font-bold text-rf-live">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rf-live" />
            EN DIRECT
          </span>
        ) : (
          <span />
        )}
        <CompetitionBadge logoUrl={match.competition.logoUrl} name={match.competition.name} />
      </div>

      <div className="grid grid-cols-3 items-center gap-3 sm:gap-6">
        <TeamColumn name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} />

        <div className="text-center">
          {hasScore ? (
            <p className="font-display text-4xl font-extrabold text-rf-fg sm:text-5xl">
              {match.homeScore} <span className="text-rf-fg-subtle">–</span> {match.awayScore}
            </p>
          ) : (
            <p className="font-display text-2xl font-bold text-rf-fg-muted">vs</p>
          )}

          {isLive && (
            <p className="mt-2 text-sm font-bold text-rf-live">
              {match.status === "HALFTIME" ? "Mi-temps" : `${match.minute ?? 0}'`}
            </p>
          )}

          {isScheduled &&
            (countdown !== null ? (
              <div className="mt-3">
                <CountdownDisplay ms={countdown} />
              </div>
            ) : (
              <p className="mt-2 text-sm text-rf-fg-muted">
                {new Date(match.kickoffAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
              </p>
            ))}

          {!isLive && !isScheduled && <p className="mt-2 text-sm font-semibold text-rf-fg-subtle">Terminé</p>}
        </div>

        <TeamColumn name={match.awayTeam.name} crestUrl={match.awayTeam.crestUrl} />
      </div>

      <div className="mt-6 border-t border-rf-border pt-5">
        <MatchVotePanel matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
      </div>

      <Link
        href={`/matches/${match.id}`}
        className="mt-5 block rounded-xl bg-rf-gold py-2.5 text-center text-sm font-bold text-rf-bg transition-colors hover:bg-rf-gold-soft"
      >
        Voir les détails du match
      </Link>
    </div>
  );
}

function TeamColumn({ name, crestUrl }: { name: string; crestUrl: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamCrest crestUrl={crestUrl} teamName={name} size="lg" />
      <span className="line-clamp-2 text-sm font-medium text-rf-fg">{name}</span>
    </div>
  );
}
