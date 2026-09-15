import Redis from "ioredis";
import { getEnv, hasFootballApiKey, hasFootballDataOrgApiKey, hasHighlightlyApiKey } from "@rexfoot/config";
import type { FootballDataProvider } from "./FootballDataProvider";
import { ApiFootballProvider } from "./providers/apiFootball";
import { FootballDataOrgProvider } from "./providers/footballDataOrg";
import { CompositeFootballProvider } from "./providers/composite";
import { NullFootballProvider } from "./providers/nullProvider";
import { RedisCachingProvider } from "./cache/redisCachingProvider";
import { HighlightlyClient } from "./highlightly";

export * from "./FootballDataProvider";
export * from "./types";
export { ApiFootballProvider } from "./providers/apiFootball";
export { FootballDataOrgProvider } from "./providers/footballDataOrg";
export { CompositeFootballProvider } from "./providers/composite";
export { NullFootballProvider } from "./providers/nullProvider";
export { RedisCachingProvider } from "./cache/redisCachingProvider";
export {
  HighlightlyClient,
  HighlightlyProviderError,
  sameTeamName,
  type HighlightlyEvent,
  type HighlightlyLineups,
  type HighlightlyLineupPlayer,
  type HighlightlyTeamLineup,
  type HighlightlyTeamStatistics,
} from "./highlightly";

let cachedHighlightlyClient: HighlightlyClient | undefined | null;

/** null si HIGHLIGHTLY_API_KEY n'est pas configurée — jamais d'appel réseau dans ce cas. */
export function createHighlightlyClientIfConfigured(): HighlightlyClient | null {
  if (cachedHighlightlyClient !== undefined) return cachedHighlightlyClient;
  const env = getEnv();
  cachedHighlightlyClient = hasHighlightlyApiKey(env) ? new HighlightlyClient(env.HIGHLIGHTLY_API_KEY) : null;
  return cachedHighlightlyClient;
}

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
 * FootballDataProvider prêt à l'emploi. Quand les deux clés sont configurées
 * (football-data.org + API-Football), un provider composite est utilisé :
 * football-data.org reste le fournisseur principal, API-Football est consulté
 * en repli pour les compétitions que le premier ne couvre pas (ex. Coupe de
 * France). Sinon, le fournisseur unique configuré est utilisé, ou un provider
 * "null" qui renvoie des listes vides — jamais de fausse donnée, jamais de
 * crash.
 */
export function createFootballProvider(): FootballDataProvider {
  if (cachedProvider) return cachedProvider;

  const env = getEnv();
  cachedRedis ??= new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });

  const hasFdo = hasFootballDataOrgApiKey(env);
  const hasApi = hasFootballApiKey(env);

  if (hasFdo && hasApi) {
    // Les deux clés configurées : provider composite. football-data.org
    // reste le primary (gratuit, sans plafond quotidien) ; API-Football
    // sert de repli pour les compétitions manquantes (Coupe de France, etc.).
    const primary = new FootballDataOrgProvider({ apiKey: env.FOOTBALL_DATA_ORG_API_KEY });
    const secondary = new ApiFootballProvider({ apiKey: env.RAPIDAPI_KEY, apiHost: env.RAPIDAPI_HOST });
    const composite = new CompositeFootballProvider(primary, secondary);
    cachedProvider = new RedisCachingProvider(composite, cachedRedis);
    return cachedProvider;
  }

  if (hasFdo) {
    const base = new FootballDataOrgProvider({ apiKey: env.FOOTBALL_DATA_ORG_API_KEY });
    cachedProvider = new RedisCachingProvider(base, cachedRedis);
    return cachedProvider;
  }

  if (hasApi) {
    const base = new ApiFootballProvider({ apiKey: env.RAPIDAPI_KEY, apiHost: env.RAPIDAPI_HOST });
    cachedProvider = new RedisCachingProvider(base, cachedRedis);
    return cachedProvider;
  }

  cachedProvider = new NullFootballProvider();
  return cachedProvider;
}
