/**
 * POST /api/admin/trigger-sync — Déclenche manuellement sync-fixtures et
 * sync-standings. Endpoint temporaire pour peupler les données des nouvelles
 * compétitions sans attendre le cycle automatique (6-8h).
 *
 * Protégé par auth admin (requirePermission).
 */
import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { getEnv } from "@rexfoot/config";
import { requirePermission } from "@/lib/api-response";

const SYNC_QUEUE = "rexfoot-sync";

function createSyncQueue(): Queue {
  const connection = new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
  return new Queue(SYNC_QUEUE, { connection });
}

export async function POST(request: Request) {
  const { admin, response } = await requirePermission(request, "manageNews");
  if (!admin) return response;

  const queue = createSyncQueue();

  try {
    const [fixtures, standings] = await Promise.all([
      queue.add("sync-fixtures", {}, { removeOnComplete: { count: 20 }, removeOnFail: { count: 50 } }),
      queue.add("sync-standings", {}, { removeOnComplete: { count: 20 }, removeOnFail: { count: 50 } }),
    ]);

    console.log(`[trigger-sync] Jobs déclenchés par ${admin.id}: sync-fixtures=${fixtures.id}, sync-standings=${standings.id}`);

    return NextResponse.json({
      ok: true,
      fixtures: { id: fixtures.id },
      standings: { id: standings.id },
    });
  } catch (err) {
    console.error("[trigger-sync] Erreur:", err);
    return NextResponse.json({ ok: false, error: "Erreur lors du déclenchement des jobs." }, { status: 500 });
  }
}
