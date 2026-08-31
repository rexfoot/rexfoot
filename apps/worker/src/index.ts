import { Worker, type Job } from "bullmq";
import { getEnv, hasFootballApiKey } from "@rexfoot/config";
import { createBullMqConnection } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import { SYNC_QUEUE_NAME, JobName, createSyncQueue, registerScheduledJobs, scheduleNextLiveScoresRun } from "./scheduler.js";
import { syncFixtures } from "./jobs/syncFixtures.js";
import { syncLiveScores } from "./jobs/syncLiveScores.js";
import { syncStandings } from "./jobs/syncStandings.js";
import { syncPlayerStats } from "./jobs/syncPlayerStats.js";
import { syncRosters } from "./jobs/syncRosters.js";

async function main(): Promise<void> {
  getEnv(); // valide les variables d'env dès le démarrage, échoue vite si mal configuré

  if (!hasFootballApiKey()) {
    logger.info(
      "RAPIDAPI_KEY non configurée — le worker démarre quand même, tous les jobs de " +
        "synchronisation seront no-op jusqu'à ce qu'une clé soit fournie via Railway.",
    );
  }

  const queue = createSyncQueue();

  const worker = new Worker(
    SYNC_QUEUE_NAME,
    async (job: Job) => {
      switch (job.name) {
        case JobName.syncFixtures:
          return syncFixtures();
        case JobName.syncStandings:
          return syncStandings();
        case JobName.syncPlayerStats:
          return syncPlayerStats();
        case JobName.syncRosters:
          return syncRosters();
        case JobName.syncLiveScores: {
          const hadLiveMatches = await syncLiveScores();
          await scheduleNextLiveScoresRun(queue, hadLiveMatches);
          return hadLiveMatches;
        }
        default:
          logger.warn({ job: job.name }, "Job inconnu, ignoré");
          return undefined;
      }
    },
    { connection: createBullMqConnection(), concurrency: 1 },
  );

  worker.on("completed", (job) => logger.debug({ job: job.name }, "Job terminé"));
  worker.on("failed", (job, err) => logger.error({ job: job?.name, err }, "Job en échec"));

  await registerScheduledJobs(queue);
  logger.info("RexFoot worker démarré, jobs planifiés");

  const shutdown = async () => {
    logger.info("Arrêt du worker…");
    await worker.close();
    await queue.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Échec du démarrage du worker");
  process.exit(1);
});
