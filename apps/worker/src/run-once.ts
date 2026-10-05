/**
 * Lanceur "one-shot" pour GitHub Actions (plan B sans VM 24h/24).
 *
 * Usage : tsx src/run-once.ts <mode>
 *   live      scores + événements en direct (toutes les 10 min)
 *   frequent  traductions, photos, YouTube, headlines (toutes les 30 min)
 *   slow      calendriers, classements, effectifs, blessures (2x/jour)
 *   daily     digest éditorial (7h), transferts
 *   weekly    récap hebdo (lundi 8h)
 *   video <articleId>  vidéo d'article à la demande (workflow_dispatch)
 *
 * Contrairement à index.ts (processus BullMQ/socket.io 24h/24 sur Railway),
 * chaque mode s'exécute UNE fois puis le processus se termine — la cadence
 * est portée par le cron GitHub Actions. Aucune file, aucun serveur.
 * Redis reste nécessaire (cache + verrous) via REDIS_URL (Upstash).
 */
import { getEnv, hasAnyFootballProviderKey } from "@rexfoot/config";
import { hasAiProviderConfigured } from "@rexfoot/ai-provider";
import { logger } from "./lib/logger.js";
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
import { aggregateHeadlines } from "./jobs/aggregator/aggregateHeadlines.js";
import { generateArticleVideo } from "./jobs/generateArticleVideo.js";

async function resilient(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
    logger.info({ job: name }, "Job one-shot terminé");
  } catch (cause) {
    // Un job en échec ne doit jamais faire échouer tout le run (les autres
    // jobs doivent tourner quand même) — mais on sort en code 1 à la fin
    // pour que le run GitHub Actions soit marqué en échec et visible.
    logger.error({ job: name, cause }, "Job one-shot en échec");
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  getEnv(); // échoue vite si mal configuré (jamais de secret dans les logs)

  if (!hasAnyFootballProviderKey()) {
    logger.info("Aucune clé football — les jobs de sync seront no-op.");
  }
  if (!hasAiProviderConfigured()) {
    logger.info("Aucune clé IA — l'éditorial restera no-op.");
  }

  const [mode, arg] = process.argv.slice(2);
  switch (mode) {
    case "live":
      // Boucle 24h/24 remplacée par cron 10 min : un seul passage chacun.
      await resilient("sync-live-scores", () => syncLiveScores());
      await resilient("sync-match-events", () => syncMatchEvents());
      break;
    case "frequent":
      await resilient("translate-articles", () => translateArticles());
      await resilient("sync-player-photos", () => syncPlayerPhotos());
      await resilient("sync-youtube-videos", () => syncYoutubeVideos());
      await resilient("aggregate-headlines", () => aggregateHeadlines());
      break;
    case "slow":
      await resilient("sync-fixtures", () => syncFixtures());
      await resilient("sync-standings", () => syncStandings());
      await resilient("sync-rosters", () => syncRosters());
      await resilient("sync-player-stats", () => syncPlayerStats());
      await resilient("sync-injuries", () => syncInjuries());
      await resilient("extract-transfers", () => extractTransfersFromArticles());
      break;
    case "daily":
      await resilient("editorial-digest", () => runEditorialDigest());
      break;
    case "weekly":
      await resilient("weekly-recap", () => generateWeeklyRecap());
      break;
    case "video":
      if (!arg) {
        logger.error("Usage : run-once.ts video <articleId>");
        process.exit(2);
      }
      await resilient("generate-article-video", () => generateArticleVideo(arg));
      break;
    default:
      logger.error("Usage : run-once.ts <live|frequent|slow|daily|weekly|video> [articleId]");
      process.exit(2);
  }
  logger.info("Run one-shot terminé");
}

main().catch((err) => {
  logger.error({ err }, "Échec du run one-shot");
  process.exit(1);
});
