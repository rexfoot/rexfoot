import Redis from "ioredis";
import { getEnv } from "@rexfoot/config";

/**
 * Connexion Redis dédiée à BullMQ (queue + jobs répétables). Distincte du
 * client Redis utilisé par RedisCachingProvider — BullMQ a besoin de
 * `maxRetriesPerRequest: null` sur sa propre connexion.
 */
export function createBullMqConnection(): Redis {
  return new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: null });
}
