import Redis from "ioredis";
import { getEnv, hasFootballApiKey } from "@rexfoot/config";
import type { FootballDataProvider } from "./FootballDataProvider";
import { ApiFootballProvider } from "./providers/apiFootball";
import { NullFootballProvider } from "./providers/nullProvider";
import { RedisCachingProvider } from "./cache/redisCachingProvider";

export * from "./FootballDataProvider";
export * from "./types";
export { ApiFootballProvider } from "./providers/apiFootball";
export { NullFootballProvider } from "./providers/nullProvider";
export { RedisCachingProvider } from "./cache/redisCachingProvider";

let cachedProvider: FootballDataProvider | undefined;
let cachedRedis: Redis | undefined;

/**
 * Point d'entrée unique utilisé par apps/web et apps/worker pour obtenir un
 * FootballDataProvider prêt à l'emploi : API-Football + cache Redis si une
 * clé est configurée, sinon un provider "null" qui renvoie des listes vides
 * (jamais de fausse donnée, jamais de crash).
 */
export function createFootballProvider(): FootballDataProvider {
  if (cachedProvider) return cachedProvider;

  const env = getEnv();

  if (!hasFootballApiKey(env)) {
    cachedProvider = new NullFootballProvider();
    return cachedProvider;
  }

  cachedRedis ??= new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });

  const base = new ApiFootballProvider({ apiKey: env.RAPIDAPI_KEY, apiHost: env.RAPIDAPI_HOST });
  cachedProvider = new RedisCachingProvider(base, cachedRedis);
  return cachedProvider;
}
