"use client";

import useSWR from "swr";
import { LIVE_POLL_INTERVAL_MS } from "@rexfoot/config";
import type { MatchDetail } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMatchDetail(matchId: string, initialMatch: MatchDetail) {
  const isLive = initialMatch.status === "LIVE" || initialMatch.status === "HALFTIME";

  const { data } = useSWR<{ match: MatchDetail }>(`/api/matches/${matchId}`, fetcher, {
    fallbackData: { match: initialMatch },
    refreshInterval: isLive ? LIVE_POLL_INTERVAL_MS : 0,
    revalidateOnFocus: isLive,
  });

  return data?.match ?? initialMatch;
}
