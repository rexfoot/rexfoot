"use client";

import useSWR from "swr";
import { LIVE_POLL_INTERVAL_MS } from "@rexfoot/config";
import type { MatchSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function hasLiveMatch(matches: MatchSummary[]): boolean {
  return matches.some((m) => m.status === "LIVE" || m.status === "HALFTIME");
}

/** Reste statique tant qu'aucun match de la liste n'est en direct — ne poll que si nécessaire. */
export function useMatchesList(apiUrl: string, initialMatches: MatchSummary[]) {
  const { data } = useSWR<{ matches: MatchSummary[] }>(apiUrl, fetcher, {
    fallbackData: { matches: initialMatches },
    refreshInterval: (latest) =>
      latest && hasLiveMatch(latest.matches) ? LIVE_POLL_INTERVAL_MS : 0,
  });

  return data?.matches ?? initialMatches;
}
