import { Worker, type Job } from "bullmq";
import { getEnv, hasAnyFootballProviderKey } from "@rexfoot/config";
import { hasAiProviderConfigured } from "@rexfoot/ai-provider";
import { createBullMqConnection } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import {
  SYNC_QUEUE_NAME,
  VIDEO_QUEUE_NAME,
  JobName,
  createSyncQueue,
  registerScheduledJobs,
  scheduleNextLiveScoresRun,
  scheduleNextMatchEventsRun,
} from "./scheduler.js";
import { syncFixtures } from "./jobs/syncFixtures.js";
import { syncLiveScores } from "./jobs/syncLiveScores.js";
import { syncStandings } from "./jobs/syncStandings.js";
import { syncPlayerStats } from "./jobs/syncPlayerStats.js";
import { syncRosters } from "./jobs/syncRosters.js";
import { syncYoutubeVideos } from "./jobs/syncYoutubeVideos.js";
import { generateWeeklyRecap } from "./jobs/generateWeeklyRecap.js";
import { syncMatchEvents } from "./jobs/syncMatchEvents.js";
import { runEditorialDigest } from "./jobs/editorial/runEditorialDigest.js";
import { extractTransfersFromArticles } from "./jobs/editorial/extractTransfers.js";
import { translateArticles } from "./jobs/editorial/translateArticle.js";
import { syncPlayerPhotos } from "./jobs/syncPlayerPhotos.js";
import { syncInjuries } from "./jobs/syncInjuries.js";
import { generateArticleVideo } from "./jobs/generateArticleVideo.js";
import { startRealtimeServer } from "./lib/realtime.js";

async function main(): Promise<void> {
  getEnv(); // valide les variables d'env dès le démarrage, échoue vite si mal configuré

  if (!hasAnyFootballProviderKey()) {
    logger.info(
      "Aucune clé de fournisseur football (FOOTBALL_DATA_ORG_API_KEY / RAPIDAPI_KEY) — le worker " +
        "démarre quand même, tous les jobs de synchronisation seront no-op jusqu'à ce qu'une clé soit fournie via Railway.",
    );
  }
  if (!hasAiProviderConfigured()) {
    logger.info(
      "Aucune clé IA configurée (GEMINI/GROQ/OPENROUTER) — l'agent éditorial démarre " +
        "quand même mais restera no-op tant qu'une clé n'est pas fournie via Railway.",
    );
  }

  startRealtimeServer();

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
        case JobName.editorialDigest:
          return runEditorialDigest();
        case JobName.extractTransfers:
          return extractTransfersFromArticles();
        case JobName.translateArticles:
          return translateArticles();
        case JobName.syncInjuries:
          return syncInjuries();
        case JobName.syncPlayerPhotos:
          return syncPlayerPhotos();
        case JobName.syncYoutubeVideos:
          return syncYoutubeVideos();
        case JobName.weeklyRecap:
          return generateWeeklyRecap();
        case JobName.syncMatchEvents: {
          // Même principe de résilience que syncLiveScores ci-dessous : un
          // échec transitoire (quota Highlightly épuisé, requête en timeout)
          // ne doit jamais interrompre la chaîne auto-replanifiée pour de bon.
          let hadLiveMatches = true;
          try {
            hadLiveMatches = await syncMatchEvents();
          } catch (cause) {
            logger.error({ cause }, "Échec de syncMatchEvents, replanifié quand même (cadence rapide par précaution)");
          }
          await scheduleNextMatchEventsRun(queue, hadLiveMatches);
          return hadLiveMatches;
        }
        case JobName.syncLiveScores: {
          // Bug réel constaté en prod (2026-09-05, juste après le passage à
          // une cadence de 15s) : football-data.org a renvoyé un 429, ce qui
          // faisait planter toute la boucle AVANT scheduleNextLiveScoresRun —
          // la chaîne auto-replanifiée s'arrêtait alors pour de bon (plus
          // aucun "Scores en direct synchronisés" dans les logs ensuite, tant
          // qu'un redéploiement ne relançait pas registerScheduledJobs). Une
          // seule erreur transitoire du fournisseur ne doit jamais interrompre
          // le direct indéfiniment : on replanifie toujours, y compris en cas
          // d'échec (cadence rapide par défaut dans ce cas, plus sûr que de
          // supposer "plus aucun match en direct").
          let hadLiveMatches = true;
          try {
            hadLiveMatches = await syncLiveScores();
          } catch (cause) {
            logger.error({ cause }, "Échec de syncLiveScores, replanifié quand même (cadence rapide par précaution)");
          }
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

  const videoWorker = new Worker(
    VIDEO_QUEUE_NAME,
    async (job: Job) => {
      switch (job.name) {
        case JobName.generateArticleVideo: {
          const articleId = job.data.articleId as string;
          if (!articleId) {
            logger.error("generate-article-video : articleId manquant dans les données du job");
            return null;
          }
          logger.info({ articleId, jobId: job.id }, "generate-article-video : début du traitement");
          try {
            const result = await generateArticleVideo(articleId);
            logger.info({ articleId, jobId: job.id, result }, "generate-article-video : traité avec succès");
            return result;
          } catch (err) {
            logger.error({ articleId, jobId: job.id, err }, "generate-article-video : échec du traitement");
            throw err;
          }
        }
        default:
          logger.warn({ job: job.name }, "Video worker: job inconnu, ignoré");
          return undefined;
      }
    },
    { connection: createBullMqConnection(), concurrency: 1 },
  );

  videoWorker.on("completed", (job) => logger.debug({ job: job.name }, "Video job terminé"));
  videoWorker.on("failed", (job, err) => logger.error({ job: job?.name, err }, "Video job en échec"));

  await registerScheduledJobs(queue);
  logger.info("RexFoot worker démarré, jobs planifiés");

  const shutdown = async () => {
    logger.info("Arrêt du worker…");
    await videoWorker.close();
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
