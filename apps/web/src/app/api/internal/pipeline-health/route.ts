import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { getEnv } from "@rexfoot/config";
import { apiError } from "@/lib/api-response";

/**
 * GET /api/internal/pipeline-health — résumé en lecture seule de l'état de la
 * newsroom multi-agents, pour l'agent de supervision Claude planifié (cloud,
 * hors réseau RexFoot — voir CLAUDE.md, section Supervision). Volontairement
 * séparé de tout accès direct à DATABASE_URL : en cas de fuite du jeton,
 * seul ce résumé agrégé est exposé, jamais la base elle-même ni aucune
 * capacité d'écriture. Même données que packages/supervisor-mcp, exposées
 * ici en HTTP car un agent cloud ne peut pas atteindre un serveur MCP local.
 *
 * Auth par jeton porteur (SUPERVISOR_API_TOKEN) — pas de session admin ici,
 * un agent cloud ne peut pas passer par le flux de connexion habituel.
 * Répond 404 (pas 401/403) tant que le jeton n'est pas configuré, pour ne
 * jamais laisser deviner que cet endpoint existe avant qu'il soit activé.
 */
export async function GET(request: Request) {
  const env = getEnv();
  const token = env.SUPERVISOR_API_TOKEN.trim();
  if (!token) {
    return apiError(404, "Introuvable.");
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (provided !== token) {
    return apiError(404, "Introuvable.");
  }

  const [failedTasks, draftBacklogCount, oldestDrafts, publishedRecent, activeCompetitions, resolvedCompetitions, lastInjurySync] =
    await Promise.all([
      prisma.agentTask.findMany({
        where: { status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: { entityType: true, entityId: true, taskType: true, attempts: true, lastError: true, updatedAt: true },
      }),
      prisma.newsArticle.count({ where: { status: "DRAFT", isAiDraft: true } }),
      prisma.newsArticle.findMany({
        where: { status: "DRAFT", isAiDraft: true },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: { id: true, title: true, createdAt: true },
      }),
      prisma.newsArticle.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 200,
        select: { id: true, title: true, publishedAt: true, translations: { select: { locale: true } } },
      }),
      prisma.competition.count({ where: { isActive: true } }),
      prisma.competition.count({ where: { isActive: true, apiFootballId: { not: null } } }),
      prisma.agentTask.findFirst({
        where: { entityType: "PLAYER", taskType: "SYNC_INJURY", status: "DONE" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

  const translationGaps = publishedRecent
    .map((a) => ({
      id: a.id,
      title: a.title,
      publishedAt: a.publishedAt,
      missing: (["EN", "ES"] as const).filter((locale) => !a.translations.some((t) => t.locale === locale)),
    }))
    .filter((a) => a.missing.length > 0);

  // Diagnostic Web Push (jamais de clé exposée) : aide à comprendre pourquoi
  // /api/push/vapid-key répond 503 sans accès aux logs Railway.
  let push: Record<string, unknown> = { envPublicKey: (process.env.VAPID_PUBLIC_KEY?.trim()?.length ?? 0) > 0 };
  try {
    const table = await prisma.appSetting.count();
    push = { ...push, appSettingRows: table };
    const { getOrCreateVapidKeys } = await import("@rexfoot/db");
    const keys = await getOrCreateVapidKeys();
    push = { ...push, keygen: "ok", publicPrefix: keys.publicKey.slice(0, 8) };
  } catch (err) {
    push = { ...push, keygen: "error", error: err instanceof Error ? `${err.name}: ${err.message.slice(0, 200)}` : String(err).slice(0, 200) };
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    failedTasks,
    draftBacklog: { totalPending: draftBacklogCount, oldest: oldestDrafts },
    translationGaps: { checked: publishedRecent.length, gaps: translationGaps },
    injurySync: { activeCompetitions, resolvedCompetitions, lastSuccessfulSyncAt: lastInjurySync?.updatedAt ?? null },
    push,
  });
}
