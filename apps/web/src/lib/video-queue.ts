import { Queue } from "bullmq";
import Redis from "ioredis";
import { getEnv } from "@rexfoot/config";

let queue: Queue | undefined;

function createBullMqConnection(): Redis {
  const url = getEnv().REDIS_URL;
  console.log(`[article-video-queue] Création connexion Redis BullMQ (url=${url.substring(0, 20)}...)`);
  return new Redis(url, { maxRetriesPerRequest: null });
}

function getQueue(): Queue {
  if (!queue) {
    console.log("[article-video-queue] Création de la file BullMQ 'rexfoot-sync'");
    queue = new Queue("rexfoot-sync", { connection: createBullMqConnection() });
  }
  return queue;
}

/**
 * Ajoute un job de génération vidéo d'article à la file BullMQ.
 * Le worker traitera le job en arrière-plan et créera la vidéo.
 */
export async function enqueueArticleVideoGeneration(articleId: string): Promise<void> {
  const q = getQueue();
  const jobId = `article-video-${articleId}-${Date.now()}`;
  console.log(`[article-video-queue] Ajout du job ${jobId} pour article ${articleId}`);

  try {
    await q.add(
      "generate-article-video",
      { articleId },
      {
        jobId,
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 10 },
      },
    );
    console.log(`[article-video-queue] Job ${jobId} ajouté avec succès`);
  } catch (err) {
    console.error(`[article-video-queue] Échec de l'ajout du job ${jobId}:`, err);
    throw err;
  }
}
