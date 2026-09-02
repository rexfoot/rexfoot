import Redis from "ioredis";
import { getEnv, hasFootballApiKey, hasFootballDataOrgApiKey } from "@rexfoot/config";
import type { FootballDataProvider } from "./FootballDataProvider";
import { ApiFootballProvider } from "./providers/apiFootball";
import { FootballDataOrgProvider } from "./providers/footballDataOrg";
import { NullFootballProvider } from "./providers/nullProvider";
import { RedisCachingProvider } from "./cache/redisCachingProvider";

export * from "./FootballDataProvider";
export * from "./types";
export { ApiFootballProvider } from "./providers/apiFootball";
export { FootballDataOrgProvider } from "./providers/footballDataOrg";
export { NullFootballProvider } from "./providers/nullProvider";
export { RedisCachingProvider } from "./cache/redisCachingProvider";

/**
 * Identifiant `provider` à stocker sur Team/Player/Season/Fixture/Competition
 * — une seule source de vérité utilisée par apps/worker, pour éviter la
 * duplication de constantes locales qui existait avant ce fichier
 * (PROVIDER_NAME redéclaré séparément dans upsert.ts, syncLiveScores.ts, et
 * codé en dur dans syncFixtures.ts). Fonction, pas une constante figée : doit
 * refléter le fournisseur réellement actif (voir createFootballProvider),
 * pas toujours football-data.org si un repli API-Football est en jeu.
 */
export function getActiveProviderName(env = getEnv()): string {
  if (hasFootballDataOrgApiKey(env)) return "football-data-org";
  if (hasFootballApiKey(env)) return "api-football";
  return "none";
}

let cachedProvider: FootballDataProvider | undefined;
let cachedRedis: Redis | undefined;

/**
 * Point d'entrée unique utilisé par apps/web et apps/worker pour obtenir un
 * FootballDataProvider prêt à l'emploi. football-data.org est préféré s'il
 * est configuré (gratuit, sans plafond quotidien) ; API-Football reste un
 * repli si sa clé est présente (utile si le compte suspendu est réactivé) ;
 * sinon un provider "null" qui renvoie des listes vides — jamais de fausse
 * donnée, jamais de crash.
 */
export function createFootballProvider(): FootballDataProvider {
  if (cachedProvider) return cachedProvider;

  const env = getEnv();
  cachedRedis ??= new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });

  if (hasFootballDataOrgApiKey(env)) {
    const base = new FootballDataOrgProvider({ apiKey: env.FOOTBALL_DATA_ORG_API_KEY });
    cachedProvider = new RedisCachingProvider(base, cachedRedis);
    return cachedProvider;
  }

  if (hasFootballApiKey(env)) {
    const base = new ApiFootballProvider({ apiKey: env.RAPIDAPI_KEY, apiHost: env.RAPIDAPI_HOST });
    cachedProvider = new RedisCachingProvider(base, cachedRedis);
    return cachedProvider;
  }

  cachedProvider = new NullFootballProvider();
  return cachedProvider;
}
