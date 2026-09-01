"use client";

import { useMatchVotes } from "@/hooks/useMatchVotes";
import { cn } from "@/lib/cn";

interface MatchVotePanelProps {
  matchId: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
}

/** Pronostic communautaire "qui va gagner ?" — vote anonyme, dédupliqué côté serveur par cookie. */
export function MatchVotePanel({ matchId, homeTeam, awayTeam }: MatchVotePanelProps) {
  const { totals, mutate } = useMatchVotes(matchId);

  async function vote(choice: "HOME" | "DRAW" | "AWAY") {
    const response = await fetch(`/api/matches/${matchId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice }),
    });
    if (response.ok) {
      mutate(await response.json(), false);
    }
  }

  const total = totals ? totals.home + totals.draw + totals.away : 0;
  const percent = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-rf-fg-subtle uppercase">Qui va gagner ?</p>
      <VoteBar
        label={homeTeam.name}
        percent={percent(totals?.home ?? 0)}
        active={totals?.myChoice === "HOME"}
        onClick={() => vote("HOME")}
      />
      <VoteBar
        label="Match nul"
        percent={percent(totals?.draw ?? 0)}
        active={totals?.myChoice === "DRAW"}
        onClick={() => vote("DRAW")}
      />
      <VoteBar
        label={awayTeam.name}
        percent={percent(totals?.away ?? 0)}
        active={totals?.myChoice === "AWAY"}
        onClick={() => vote("AWAY")}
      />
      {total > 0 && (
        <p className="text-xs text-rf-fg-subtle">
          {total} vote{total > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function VoteBar({
  label,
  percent,
  active,
  onClick,
}: {
  label: string;
  percent: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative block w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors",
        active ? "border-rf-gold/50" : "border-rf-border hover:border-rf-gold/30",
      )}
    >
      <span className="absolute inset-y-0 left-0 bg-rf-gold/15 transition-all" style={{ width: `${percent}%` }} aria-hidden />
      <span className="relative flex items-center justify-between gap-2 font-medium text-rf-fg">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-display font-bold text-rf-gold">{percent}%</span>
      </span>
    </button>
  );
}
