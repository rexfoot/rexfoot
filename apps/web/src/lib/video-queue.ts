import { Queue } from "bullmq";
import Redis from "ioredis";
import { getEnv } from "@rexfoot/config";

let queue: Queue | undefined;

function createBullMqConnection(): Redis {
  return new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
}

function getQueue(): Queue {
  if (!queue) {
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
  await q.add(
    "generate-article-video",
    { articleId },
    {
      jobId: `article-video-${articleId}-${Date.now()}`,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    },
  );
}
