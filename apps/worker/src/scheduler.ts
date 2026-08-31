import { Queue } from "bullmq";
import { createBullMqConnection } from "./lib/redis.js";

export const SYNC_QUEUE_NAME = "rexfoot-sync";

export const JobName = {
  syncFixtures: "sync-fixtures",
  syncLiveScores: "sync-live-scores",
  syncStandings: "sync-standings",
  syncPlayerStats: "sync-player-stats",
  syncRosters: "sync-rosters",
} as const;

// Calibré pour le plan gratuit API-Football (100 requêtes/jour, 7 compétitions
// vedettes) — voir CACHE_TTL_SECONDS dans @rexfoot/config, qui doit rester
// aligné avec ces intervalles. Avec ces réglages, budget approximatif hors
// journée de match : ~28 (fixtures) + ~21 (classements) + ~24 (live idle) +
// quelques dizaines pour les stats = sous la barre des 100/jour. Une journée
// avec plusieurs matchs en direct peut dépasser le quota — c'est une limite
// inhérente au plan gratuit, pas quelque chose que le code seul peut éviter ;
// passer sur un plan payant ou réduire FEATURED_COMPETITION_SLUGS sont les
// deux leviers si une fraîcheur "live" plus fine est nécessaire.
const LIVE_SCORES_INTERVAL_DURING_MATCHES_MS = 90 * 1000;
const LIVE_SCORES_INTERVAL_IDLE_MS = 60 * 60 * 1000;

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
    { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: JobName.syncFixtures },
  );
  await queue.add(
    JobName.syncStandings,
    {},
    { repeat: { every: 8 * 60 * 60 * 1000 }, jobId: JobName.syncStandings },
  );
  await queue.add(
    JobName.syncPlayerStats,
    {},
    { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: JobName.syncPlayerStats },
  );
  await queue.add(
    JobName.syncRosters,
    {},
    { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: JobName.syncRosters },
  );

  await scheduleNextLiveScoresRun(queue, false);
}

export async function scheduleNextLiveScoresRun(queue: Queue, hadLiveMatches: boolean): Promise<void> {
  const delay = hadLiveMatches ? LIVE_SCORES_INTERVAL_DURING_MATCHES_MS : LIVE_SCORES_INTERVAL_IDLE_MS;
  await queue.add(JobName.syncLiveScores, {}, { delay, jobId: `${JobName.syncLiveScores}-${Date.now()}` });
}
