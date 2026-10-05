import webpush from "web-push";
import { prisma } from "@rexfoot/db";
import { getEnv, hasVapidConfig } from "@rexfoot/config";
import { logger } from "./logger.js";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const env = getEnv();
  if (!hasVapidConfig(env)) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export interface GoalPush {
  title: string;
  body: string;
  url: string;
}

/**
 * Envoie une notification navigateur à tous les abonnés des buts de ce match.
 * Best-effort (même philosophie que notifyWriters) : un endpoint mort
 * (404/410 côté push service = navigateur désinstallé/désabonné) est
 * supprimé en base, le reste est loggé et ignoré — jamais bloquant pour le
 * job de synchro. Sans VAPID configuré : no-op silencieux.
 */
export async function sendGoalPush(matchId: string, push: GoalPush): Promise<void> {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { matchId } });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ ...push, tag: `goal-${matchId}` });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 3600 },
        );
      } catch (cause) {
        // Endpoint expiré ou révoqué : on nettoie pour ne pas réessayer
        // indéfiniment (les push services répondent 404/410 dans ce cas).
        const status = (cause as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          logger.info({ matchId }, "Abonnement push expiré supprimé");
        } else {
          logger.warn({ matchId, cause }, "Échec d'envoi push (abonné conservé)");
        }
      }
    }),
  );
}
