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
  "european-championship",
  "world-cup",
] as const;

export type FeaturedCompetitionSlug = (typeof FEATURED_COMPETITION_SLUGS)[number];

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MATCHES = 30;
export const PAGE_SIZE_VIDEOS = 24;

/**
 * Durées de cache (secondes) pour la couche Redis devant le FootballDataProvider.
 * Le fournisseur actif (football-data.org, plan gratuit) limite à 10 requêtes
 * par MINUTE plutôt qu'un plafond quotidien — voir footballDataOrg.ts. Ces TTL
 * évitent des appels redondants plutôt que de protéger un quota journalier.
 * Voir aussi les intervalles des jobs dans apps/worker/src/scheduler.ts, qui
 * doivent rester alignés (un TTL plus court que l'intervalle de sync n'apporte
 * aucun bénéfice).
 */
export const CACHE_TTL_SECONDS = {
  live: 90,
  fixturesShortTerm: 6 * 60 * 60,
  standings: 8 * 60 * 60,
  staticEntities: 24 * 60 * 60,
} as const;

/** Intervalle de polling client (ms) recommandé pour les pages qui affichent du direct. */
export const LIVE_POLL_INTERVAL_MS = 15_000;

/**
 * Fenêtre (heures) pendant laquelle un article marqué isBreaking=true est
 * effectivement traité comme urgent (bandeau, badge) après sa publication —
 * passé ce délai, il redevient un article normal même si le flag n'a pas été
 * désactivé à la main (section 12 du plan : jamais d'alerte périmée).
 */
export const BREAKING_NEWS_WINDOW_HOURS = 24;

/**
 * Flux RSS publics surveillés par l'agent éditorial (apps/worker/src/jobs/editorial)
 * pour détecter des sujets — jamais pour en recopier le contenu : un flux RSS ne
 * fournit que titre + résumé court + lien, jamais le corps de l'article. Foot
 * Mercato (demandé par l'utilisateur) n'a pas de flux RSS public exploitable au
 * moment de l'écriture (toutes les URLs testées redirigent vers une page d'erreur) —
 * à réessayer plus tard si le site republie un flux valide.
 */
export const EDITORIAL_SOURCE_FEEDS = [
  { publisherName: "L'Équipe", url: "https://dwh.lequipe.fr/api/edito/rss?path=/Football" },
  { publisherName: "RMC Sport", url: "https://rmcsport.bfmtv.com/rss/football/" },
  { publisherName: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/football/rss.xml" },
  { publisherName: "Sky Sports", url: "https://www.skysports.com/rss/12040" },
  { publisherName: "Marca", url: "https://www.marca.com/rss/futbol.xml" },
  { publisherName: "AS", url: "https://as.com/rss/futbol/portada.xml" },
  { publisherName: "ESPN FC", url: "https://www.espn.com/espn/rss/soccer/news" },
] as const;

/**
 * Chaîne YouTube du propriétaire de RexFoot (handle public @youblive, affiché
 * "souss-actualités" — le handle et le nom de la chaîne sont deux champs
 * indépendants côté YouTube). Résolu une fois manuellement via la page de la
 * chaîne (canonical -> /channel/UC...) : YouTube n'expose pas de résolution
 * handle -> id sans clé API, et l'id de chaîne ne change jamais contrairement
 * au handle. Sert de source à syncYoutubeVideos (apps/worker) via son flux
 * RSS public (pas de clé API requise, pas de quota).
 */
export const YOUTUBE_CHANNEL_ID = "UCiuPF8_U1DLILNWwzf1cyvA";
