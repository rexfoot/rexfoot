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

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MATCHES = 30;
export const PAGE_SIZE_VIDEOS = 24;

/** Durées de cache (secondes) pour la couche Redis devant le FootballDataProvider. */
export const CACHE_TTL_SECONDS = {
  live: 20,
  fixturesShortTerm: 10 * 60,
  standings: 30 * 60,
  staticEntities: 24 * 60 * 60,
} as const;

/** Intervalle de polling client (ms) recommandé pour les pages qui affichent du direct. */
export const LIVE_POLL_INTERVAL_MS = 15_000;
