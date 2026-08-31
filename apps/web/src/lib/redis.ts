import Redis from "ioredis";
import { getEnv } from "@rexfoot/config";

let client: Redis | undefined;

/** Client Redis partagé côté web — utilisé pour le rate limiting des routes API publiques. */
export function getRedis(): Redis {
  client ??= new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: 2 });
  return client;
}
