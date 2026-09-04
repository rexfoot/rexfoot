"use client";

import useSWR from "swr";
import { LIVE_POLL_INTERVAL_MS } from "@rexfoot/config";
import type { MatchDetail } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Même fenêtre que useMatchesList.ts : sans elle, un match ouvert avant son
// coup d'envoi ne repasserait jamais en polling, faute de revalidation.
const WATCH_BEFORE_KICKOFF_MS = 5 * 60 * 1000;
const WATCH_AFTER_KICKOFF_MS = 3 * 60 * 60 * 1000;

function needsPolling(match: MatchDetail): boolean {
  if (match.status === "LIVE" || match.status === "HALFTIME") return true;
  if (match.status !== "SCHEDULED") return false;
  const now = Date.now();
  const kickoff = new Date(match.kickoffAt).getTime();
  return kickoff - WATCH_BEFORE_KICKOFF_MS <= now && now <= kickoff + WATCH_AFTER_KICKOFF_MS;
}

export function useMatchDetail(matchId: string, initialMatch: MatchDetail) {
  // refreshInterval est réévalué à chaque tick à partir de `latest` (la donnée
  // SWR la plus récente), jamais figé sur initialMatch — sinon un match ouvert
  // avant son coup d'envoi ne se mettrait jamais à jour tout seul.
  const { data } = useSWR<{ match: MatchDetail }>(`/api/matches/${matchId}`, fetcher, {
    fallbackData: { match: initialMatch },
    refreshInterval: (latest) => (latest && needsPolling(latest.match) ? LIVE_POLL_INTERVAL_MS : 0),
    revalidateOnFocus: needsPolling(initialMatch),
  });

  return data?.match ?? initialMatch;
}
