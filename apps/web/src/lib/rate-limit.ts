import { getEnv } from "@rexfoot/config";
import { getRedis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * Fenêtre fixe simple (compteur Redis + TTL) — suffisant pour protéger les
 * routes API publiques d'un abus basique sans dépendance supplémentaire.
 * Clé = IP + route, pour isoler les quotas par endpoint.
 */
export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  const env = getEnv();
  const redis = getRedis();
  const key = `ratelimit:${identifier}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, env.RATE_LIMIT_WINDOW_SECONDS);
  }

  return {
    allowed: count <= env.RATE_LIMIT_MAX,
    remaining: Math.max(0, env.RATE_LIMIT_MAX - count),
    limit: env.RATE_LIMIT_MAX,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}
