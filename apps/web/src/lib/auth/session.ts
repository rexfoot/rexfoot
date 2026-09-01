import { randomBytes } from "node:crypto";
import { getRedis } from "@/lib/redis";

export const SESSION_COOKIE_NAME = "rf_admin_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours

function sessionKey(token: string): string {
  return `admin-session:${token}`;
}

/** Crée une session admin (stockée dans Redis, jamais côté client) et renvoie le token à mettre en cookie. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await getRedis().set(sessionKey(token), userId, "EX", SESSION_TTL_SECONDS);
  return token;
}

/** Renvoie l'id utilisateur associé au token, ou `null` si absent/expiré. */
export async function getSessionUserId(token: string): Promise<string | null> {
  return getRedis().get(sessionKey(token));
}

export async function destroySession(token: string): Promise<void> {
  await getRedis().del(sessionKey(token));
}

export { SESSION_TTL_SECONDS };
