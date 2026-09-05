"use client";

import { io, type Socket } from "socket.io-client";

/**
 * Connexion Socket.io partagée vers le worker (temps réel des scores en
 * direct, demandé 2026-09-05) — un seul singleton par onglet, quel que soit
 * le nombre de composants qui écoutent "fixture:update" (useMatchDetail.ts,
 * useMatchesList.ts). Renvoie `null` si NEXT_PUBLIC_WORKER_WS_URL n'est pas
 * configurée : le polling SWR (LIVE_POLL_INTERVAL_MS) reste alors la seule
 * source de fraîcheur, sans erreur ni tentative de connexion à une URL vide.
 */
let socket: Socket | undefined;

export function getRealtimeSocket(): Socket | null {
  const url = process.env.NEXT_PUBLIC_WORKER_WS_URL;
  if (!url) return null;

  if (!socket) {
    socket = io(url, { transports: ["websocket"], reconnectionDelay: 2000 });
  }
  return socket;
}
