import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-response";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { getEnv } from "@rexfoot/config";

/**
 * GET /api/admin/video-queue-test
 * Diagnostique la connexion Redis et la file BullMQ depuis le web app.
 */
export async function GET(request: Request) {
  const { admin, response } = await requireAdmin(request);
  if (!admin) return response;

  const redisUrl = getEnv().REDIS_URL;
  const maskedUrl = redisUrl.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");

  let conn: Redis | undefined;
  try {
    conn = new Redis(redisUrl, { maxRetriesPerRequest: null, connectTimeout: 10_000 });

    // Test ping
    const ping = await conn.ping();

    // Test video queue connectivity
    const queue = new Queue("rexfoot-article-video", { connection: conn });
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    await queue.close();

    return NextResponse.json({
      ok: true,
      ping,
      queue: "rexfoot-article-video",
      counts: { waiting, active, completed, failed },
      redisUrl: maskedUrl,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        redisUrl: maskedUrl,
      },
      { status: 500 },
    );
  } finally {
    if (conn) await conn.quit();
  }
}
