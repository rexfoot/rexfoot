import { Queue } from "bullmq";
import { createBullMqConnection } from "./lib/redis.js";

export const SYNC_QUEUE_NAME = "rexfoot-sync";

export const JobName = {
  syncFixtures: "sync-fixtures",
  syncLiveScores: "sync-live-scores",
  syncStandings: "sync-standings",
  syncPlayerStats: "sync-player-stats",
} as const;

const LIVE_SCORES_INTERVAL_DURING_MATCHES_MS = 20_000;
const LIVE_SCORES_INTERVAL_IDLE_MS = 10 * 60 * 1000;

export function createSyncQueue(): Queue {
  return new Queue(SYNC_QUEUE_NAME, { connection: createBullMqConnection() });
}

/**
 * Enregistre les jobs répétables à cadence fixe (fixtures, classements,
 * stats) et amorce le cycle auto-planifié de syncLiveScores. Ce dernier ne
 * suit pas un cron fixe : chaque exécution replanifie la suivante avec un
 * délai court s'il y avait des matchs en direct, ou long sinon — voir
 * index.ts où le résultat du job pilote `scheduleNextLiveScoresRun`.
 */
export async function registerScheduledJobs(queue: Queue): Promise<void> {
  await queue.add(
    JobName.syncFixtures,
    {},
    { repeat: { every: 10 * 60 * 1000 }, jobId: JobName.syncFixtures },
  );
  await queue.add(
    JobName.syncStandings,
    {},
    { repeat: { every: 30 * 60 * 1000 }, jobId: JobName.syncStandings },
  );
  await queue.add(
    JobName.syncPlayerStats,
    {},
    { repeat: { every: 15 * 60 * 1000 }, jobId: JobName.syncPlayerStats },
  );

  await scheduleNextLiveScoresRun(queue, false);
}

export async function scheduleNextLiveScoresRun(queue: Queue, hadLiveMatches: boolean): Promise<void> {
  const delay = hadLiveMatches ? LIVE_SCORES_INTERVAL_DURING_MATCHES_MS : LIVE_SCORES_INTERVAL_IDLE_MS;
  await queue.add(JobName.syncLiveScores, {}, { delay, jobId: `${JobName.syncLiveScores}-${Date.now()}` });
}
