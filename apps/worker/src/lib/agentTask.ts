import { prisma, type AgentEntityType } from "@rexfoot/db";
import { logger } from "./logger.js";

interface RunAgentTaskParams {
  entityType: AgentEntityType;
  entityId: string;
  taskType: string;
  fn: () => Promise<void>;
}

/**
 * Ledger persistant par événement pour les agents newsroom (traduction, sync
 * blessures, vérification de sources...) — ce que BullMQ seul ne garde pas
 * (il oublie l'historique une fois un job terminé). Upsert une ligne AgentTask
 * plutôt que d'en créer une nouvelle à chaque tentative, pour que l'agent de
 * supervision (voir tools/supervisor-mcp) lise un état courant par entité+tâche,
 * pas un flux d'événements à reconstituer. Isolation par tâche : un échec ici
 * ne doit jamais remonter à l'appelant (même logique que syncMatchEvents.ts /
 * extractTransfers.ts, une entité en échec ne bloque jamais les suivantes).
 */
export async function runAgentTask({ entityType, entityId, taskType, fn }: RunAgentTaskParams): Promise<boolean> {
  const key = { entityType_entityId_taskType: { entityType, entityId, taskType } };

  const task = await prisma.agentTask.upsert({
    where: key,
    create: { entityType, entityId, taskType, status: "RUNNING", startedAt: new Date(), attempts: 1 },
    update: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    await fn();
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: "DONE", finishedAt: new Date(), lastError: null, nextRunAt: null },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: "FAILED", finishedAt: new Date(), lastError: message },
    });
    logger.warn({ entityType, entityId, taskType, error: message }, "AgentTask : échec, ledger mis à jour");
    return false;
  }
}

/** Entités déjà marquées DONE pour une tâche donnée — à exclure d'un prochain lot. */
export async function entityIdsWithDoneTask(entityType: AgentEntityType, taskType: string): Promise<Set<string>> {
  const rows = await prisma.agentTask.findMany({
    where: { entityType, taskType, status: "DONE" },
    select: { entityId: true },
  });
  return new Set(rows.map((r) => r.entityId));
}
