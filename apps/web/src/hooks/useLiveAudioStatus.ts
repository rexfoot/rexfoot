"use client";

import useSWR from "swr";
import { LIVE_AUDIO_POLL_INTERVAL_MS } from "@rexfoot/config";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** Poll léger et permanent (indépendant du statut du match) — le commentateur peut démarrer son direct à tout moment. */
export function useLiveAudioStatus(): boolean {
  const { data } = useSWR<{ isLive: boolean }>("/api/live-audio", fetcher, {
    refreshInterval: LIVE_AUDIO_POLL_INTERVAL_MS,
    revalidateOnFocus: true,
  });
  return data?.isLive ?? false;
}
