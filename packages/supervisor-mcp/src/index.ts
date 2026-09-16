import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { prisma } from "@rexfoot/db";

/**
 * MCP en lecture seule pour l'agent de supervision Claude planifié
 * (voir CLAUDE.md, section "Newsroom multi-agents"). N'expose QUE des
 * requêtes Prisma en lecture — aucun tool d'écriture n'existe ici par
 * construction : cet agent signale, il ne corrige jamais rien tout seul en
 * production. Si Railway permet facilement un rôle Postgres dédié en lecture
 * seule pour DATABASE_URL, l'utiliser ici en défense en profondeur — sinon
 * cette absence de tool d'écriture reste la seule garantie.
 */
function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: "rexfoot-supervisor", version: "0.1.0" });

server.registerTool(
  "getFailedTasks",
  {
    description:
      "Tâches d'agents (AgentTask) en échec — traduction, sync blessures, etc. Chaque ligne porte entityType/entityId/taskType/lastError/attempts.",
    inputSchema: { limit: z.number().int().min(1).max(100).default(20) },
  },
  async ({ limit }) => {
    const tasks = await prisma.agentTask.findMany({
      where: { status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { entityType: true, entityId: true, taskType: true, attempts: true, lastError: true, updatedAt: true },
    });
    return textResult(tasks);
  },
);

server.registerTool(
  "getDraftBacklog",
  {
    description:
      "Articles rédigés par l'agent éditorial (isAiDraft=true) encore en DRAFT, en attente de revue humaine dans /admin/news — plus l'ancienneté grandit, plus le backlog éditorial s'accumule.",
    inputSchema: { limit: z.number().int().min(1).max(100).default(20) },
  },
  async ({ limit }) => {
    const drafts = await prisma.newsArticle.findMany({
      where: { status: "DRAFT", isAiDraft: true },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, title: true, category: true, createdAt: true },
    });
    const totalPending = await prisma.newsArticle.count({ where: { status: "DRAFT", isAiDraft: true } });
    return textResult({ totalPending, oldest: drafts });
  },
);

server.registerTool(
  "getTranslationGaps",
  {
    description:
      "Articles PUBLISHED sans traduction EN et/ou ES (ArticleTranslation manquante) — signal de retard de l'agent de traduction, pas nécessairement un problème (translateArticle.ts tourne toutes les 30 min).",
    inputSchema: {},
  },
  async () => {
    const published = await prisma.newsArticle.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, title: true, publishedAt: true, translations: { select: { locale: true } } },
      orderBy: { publishedAt: "desc" },
      take: 200,
    });
    const gaps = published
      .map((a) => ({
        id: a.id,
        title: a.title,
        publishedAt: a.publishedAt,
        missing: (["EN", "ES"] as const).filter((locale) => !a.translations.some((t) => t.locale === locale)),
      }))
      .filter((a) => a.missing.length > 0);
    return textResult({ checked: published.length, gaps });
  },
);

server.registerTool(
  "getInjurySyncFreshness",
  {
    description:
      "État de la synchro blessures/suspensions : combien de compétitions actives ont un apiFootballId résolu, et la dernière tâche SYNC_INJURY réussie. Vide/jamais rempli si RAPIDAPI_KEY n'est pas configurée ou si le plan API-Football ne couvre pas /injuries.",
    inputSchema: {},
  },
  async () => {
    const [activeCompetitions, resolvedCompetitions, lastSuccess, lastFailure] = await Promise.all([
      prisma.competition.count({ where: { isActive: true } }),
      prisma.competition.count({ where: { isActive: true, apiFootballId: { not: null } } }),
      prisma.agentTask.findFirst({
        where: { entityType: "PLAYER", taskType: "SYNC_INJURY", status: "DONE" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.agentTask.count({ where: { entityType: "PLAYER", taskType: "SYNC_INJURY", status: "FAILED" } }),
    ]);
    return textResult({ activeCompetitions, resolvedCompetitions, lastSuccessfulSyncAt: lastSuccess?.updatedAt ?? null, currentlyFailedCount: lastFailure });
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("rexfoot-supervisor-mcp: échec au démarrage", error);
  process.exit(1);
});
