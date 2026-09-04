"use client";

import useSWR from "swr";
import { LIVE_POLL_INTERVAL_MS } from "@rexfoot/config";
import type { MatchSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Marge avant/après le coup d'envoi programmé pendant laquelle on poll même
// si le statut en base est encore "SCHEDULED" : sans ça, un match qui bascule
// en direct entre deux rendus n'est jamais détecté, car refreshInterval ne
// se réévalue qu'à partir de données déjà en direct (poule aux œufs d'or).
const WATCH_BEFORE_KICKOFF_MS = 5 * 60 * 1000;
const WATCH_AFTER_KICKOFF_MS = 3 * 60 * 60 * 1000;

function needsPolling(matches: MatchSummary[]): boolean {
  const now = Date.now();
  return matches.some((m) => {
    if (m.status === "LIVE" || m.status === "HALFTIME") return true;
    if (m.status !== "SCHEDULED") return false;
    const kickoff = new Date(m.kickoffAt).getTime();
    return kickoff - WATCH_BEFORE_KICKOFF_MS <= now && now <= kickoff + WATCH_AFTER_KICKOFF_MS;
  });
}

/** Reste statique tant qu'aucun match n'est en direct ni proche de son coup d'envoi — ne poll que si nécessaire. */
export function useMatchesList(apiUrl: string, initialMatches: MatchSummary[]) {
  const { data } = useSWR<{ matches: MatchSummary[] }>(apiUrl, fetcher, {
    fallbackData: { matches: initialMatches },
    refreshInterval: (latest) =>
      latest && needsPolling(latest.matches) ? LIVE_POLL_INTERVAL_MS : 0,
  });

  return data?.matches ?? initialMatches;
}
