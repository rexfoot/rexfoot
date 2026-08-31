"use client";

import useSWR from "swr";
import { LIVE_POLL_INTERVAL_MS } from "@rexfoot/config";
import type { MatchSummary } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Rafraîchit un match côté client uniquement tant qu'il est LIVE/HALFTIME —
 * évite de poller indéfiniment un match terminé. `initialMatch` (rendu
 * serveur) sert de valeur de départ pour éviter un flash de chargement.
 */
export function useMatch(matchId: string, initialMatch: MatchSummary) {
  const isLive = initialMatch.status === "LIVE" || initialMatch.status === "HALFTIME";

  const { data } = useSWR<{ match: MatchSummary }>(`/api/matches/${matchId}`, fetcher, {
    fallbackData: { match: initialMatch },
    refreshInterval: isLive ? LIVE_POLL_INTERVAL_MS : 0,
    revalidateOnFocus: isLive,
  });

  return data?.match ?? initialMatch;
}
