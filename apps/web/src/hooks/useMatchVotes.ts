"use client";

import useSWR from "swr";
import type { MatchVoteChoice } from "@rexfoot/db";

export interface VoteTotals {
  home: number;
  draw: number;
  away: number;
  myChoice: MatchVoteChoice | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMatchVotes(matchId: string) {
  const { data, mutate } = useSWR<VoteTotals>(`/api/matches/${matchId}/votes`, fetcher);
  return { totals: data, mutate };
}
