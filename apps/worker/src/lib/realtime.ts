import { createServer } from "node:http";
import { Server as SocketIoServer } from "socket.io";
import { getEnv } from "@rexfoot/config";
import { logger } from "./logger.js";

/**
 * Diffusion temps réel des scores en direct (demandé 2026-09-05 : "le site
 * ne doit plus attendre un F5"). Le worker est déjà le seul process qui
 * écrit les changements de match (syncLiveScores.ts, syncMatchEvents.ts) —
 * plutôt que de faire porter ça à apps/web (Next.js standard, pas de serveur
 * HTTP custom), on ouvre ici un petit serveur Socket.io séparé de la boucle
 * BullMQ, sur PORT (Railway doit exposer ce service publiquement pour que le
 * navigateur puisse s'y connecter — voir NEXT_PUBLIC_WORKER_WS_URL).
 *
 * Volontairement minimal : un seul événement générique "fixture:update"
 * poussé avec juste l'id du match concerné — jamais le payload complet
 * (score/minute/événements...). Le front s'en sert comme d'un simple signal
 * pour revalider immédiatement via SWR plutôt que d'attendre le prochain
 * poll (LIVE_POLL_INTERVAL_MS), qui reste le filet de sécurité si ce canal
 * est indisponible (bloqué par un pare-feu, service redémarré, etc.).
 */
let io: SocketIoServer | undefined;

export function startRealtimeServer(): void {
  const env = getEnv();
  const httpServer = createServer();

  io = new SocketIoServer(httpServer, {
    cors: {
      origin: [env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"],
    },
  });

  io.on("connection", (socket) => {
    logger.debug({ socketId: socket.id }, "Client temps réel connecté");
  });

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Serveur temps réel (Socket.io) démarré");
  });
}

/** Signale qu'un match a changé — jamais bloquant, ignoré si le serveur n'est pas démarré. */
export function emitFixtureUpdate(fixtureId: string): void {
  io?.emit("fixture:update", { fixtureId });
}
