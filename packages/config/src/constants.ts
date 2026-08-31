export const SITE_NAME = "RexFoot";
export const SITE_TAGLINE = "The King of Football";

/** Compétitions à afficher en priorité sur la page d'accueil et la nav, dans cet ordre. */
export const FEATURED_COMPETITION_SLUGS = [
  "premier-league",
  "la-liga",
  "ligue-1",
  "serie-a",
  "bundesliga",
  "champions-league",
  "europa-league",
] as const;

export type FeaturedCompetitionSlug = (typeof FEATURED_COMPETITION_SLUGS)[number];

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MATCHES = 30;
export const PAGE_SIZE_VIDEOS = 24;

/**
 * Durées de cache (secondes) pour la couche Redis devant le FootballDataProvider.
 * Calibrées pour le plan gratuit API-Football (100 requêtes/jour) sur les
 * FEATURED_COMPETITION_SLUGS ci-dessus — voir aussi les intervalles des jobs
 * dans apps/worker/src/scheduler.ts, qui doivent rester alignés avec ces TTL
 * (un TTL plus court que l'intervalle de sync n'apporte aucun bénéfice).
 */
export const CACHE_TTL_SECONDS = {
  live: 90,
  fixturesShortTerm: 6 * 60 * 60,
  standings: 8 * 60 * 60,
  staticEntities: 24 * 60 * 60,
} as const;

/** Intervalle de polling client (ms) recommandé pour les pages qui affichent du direct. */
export const LIVE_POLL_INTERVAL_MS = 15_000;
