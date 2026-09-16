import Redis from "ioredis";
import { getEnv, hasFootballApiKey, hasFootballDataOrgApiKey, hasHighlightlyApiKey } from "@rexfoot/config";
import type { FootballDataProvider } from "./FootballDataProvider";
import { ApiFootballProvider } from "./providers/apiFootball";
import { FootballDataOrgProvider } from "./providers/footballDataOrg";
import { EspnProvider } from "./providers/espn";
import { CompositeFootballProvider } from "./providers/composite";
import { NullFootballProvider } from "./providers/nullProvider";
import { RedisCachingProvider } from "./cache/redisCachingProvider";
import { HighlightlyClient } from "./highlightly";

export * from "./FootballDataProvider";
export * from "./types";
export { ApiFootballProvider } from "./providers/apiFootball";
export { FootballDataOrgProvider } from "./providers/footballDataOrg";
export { EspnProvider, ESPN_SLUGS, COMPETITION_TO_ESPN_SLUG } from "./providers/espn";
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

let cachedApiFootballProvider: ApiFootballProvider | undefined | null;

/**
 * null si RAPIDAPI_KEY n'est pas configurée. Séparé de createFootballProvider()
 * car getInjuries() n'est pas dans FootballDataProvider commun (voir ce fichier
 * et InjuryDTO) — syncInjuries.ts a besoin de l'instance API-Football
 * spécifiquement, que ce fournisseur soit ou non le primary/secondary actif
 * de la cascade composite.
 */
export function createApiFootballProviderIfConfigured(): ApiFootballProvider | null {
  if (cachedApiFootballProvider !== undefined) return cachedApiFootballProvider;
  const env = getEnv();
  cachedApiFootballProvider = hasFootballApiKey(env)
    ? new ApiFootballProvider({ apiKey: env.RAPIDAPI_KEY, apiHost: env.RAPIDAPI_HOST })
    : null;
  return cachedApiFootballProvider;
}

/**
 * Identifiant `provider` à stocker sur Team/Player/Season/Fixture/Competition
 * — une seule source de vérité utilisée par apps/worker, pour éviter la
 * duplication de constantes locales qui existait avant ce fichier
 * (PROVIDER_NAME redéclaré séparément dans upsert.ts, syncLiveScores.ts, et
 * codé en dur dans syncFixtures.ts). Fonction, pas une constante figée : doit
 * refléter le fournisseur réellement actif (voir createFootballProvider),
 * pas toujours football-data.org si un repli ESPN ou API-Football est en jeu.
 */
export function getActiveProviderName(env = getEnv()): string {
  if (hasFootballDataOrgApiKey(env)) return "football-data-org";
  if (hasFootballApiKey(env)) return "api-football";
  // ESPN est toujours disponible (pas de clé API) — mais on ne le
  // déclarera "actif" que si aucun autre n'est configuré.
  return "espn";
}

let cachedProvider: FootballDataProvider | undefined;
let cachedRedis: Redis | undefined;

/**
 * Point d'entrée unique utilisé par apps/web et apps/worker pour obtenir un
 * FootballDataProvider prêt à l'emploi. L'architecture est une cascade de
 * providers composite :
 *
 *   1. football-data.org (primary, gratuit, 12 compétitions majeures)
 *   2. API-Football (secondary, si clé configurée — repli pour les coupes)
 *   3. ESPN (fallback final, gratuit, sans clé — 8 coupes manquantes)
 *
 * Quand un provider ne couvre pas une compétition, le composite automatique
 * essaie le suivant. Si aucune clé n'est configurée, on utilise ESPN seul
 * (mieux que NullFootballProvider — au moins les 8 coupes sont couvertes).
 */
export function createFootballProvider(): FootballDataProvider {
  if (cachedProvider) return cachedProvider;

  const env = getEnv();
  cachedRedis ??= new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });

  const hasFdo = hasFootballDataOrgApiKey(env);
  const hasApi = hasFootballApiKey(env);
  const espn = new EspnProvider();

  if (hasFdo && hasApi) {
    // Les trois clés configurées : football-data.org → API-Football → ESPN.
    const primary = new FootballDataOrgProvider({ apiKey: env.FOOTBALL_DATA_ORG_API_KEY });
    const secondary = new ApiFootballProvider({ apiKey: env.RAPIDAPI_KEY, apiHost: env.RAPIDAPI_HOST });
    const withApi = new CompositeFootballProvider(primary, secondary);
    const composite = new CompositeFootballProvider(withApi, espn);
    cachedProvider = new RedisCachingProvider(composite, cachedRedis);
    return cachedProvider;
  }

  if (hasFdo) {
    // football-data.org + ESPN : le composite essaie FDO d'abord, ESPN en repli
    // pour les 8 coupes que FDO ne couvre pas (FA Cup, Copa del Rey, etc.).
    const primary = new FootballDataOrgProvider({ apiKey: env.FOOTBALL_DATA_ORG_API_KEY });
    const composite = new CompositeFootballProvider(primary, espn);
    cachedProvider = new RedisCachingProvider(composite, cachedRedis);
    return cachedProvider;
  }

  if (hasApi) {
    // API-Football + ESPN.
    const primary = new ApiFootballProvider({ apiKey: env.RAPIDAPI_KEY, apiHost: env.RAPIDAPI_HOST });
    const composite = new CompositeFootballProvider(primary, espn);
    cachedProvider = new RedisCachingProvider(composite, cachedRedis);
    return cachedProvider;
  }

  // Aucune clé configurée : ESPN seul (gratuit, sans clé).
  // Mieux que NullFootballProvider — les 8 coupes sont quand même couvertes.
  cachedProvider = new RedisCachingProvider(espn, cachedRedis);
  return cachedProvider;
}
