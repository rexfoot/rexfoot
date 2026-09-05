import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  REDIS_URL: z.string().min(1, "REDIS_URL est requis"),

  // API-Football (RapidAPI ou direct) — conservé en repli, mais
  // FOOTBALL_DATA_ORG_API_KEY est préféré quand les deux sont configurées
  // (voir createFootballProvider dans @rexfoot/football-provider).
  RAPIDAPI_KEY: z.string().optional().default(""),
  RAPIDAPI_HOST: z.string().default("v3.football.api-sports.io"),

  // football-data.org — gratuit sans carte bancaire, limite 10 req/min (pas
  // de plafond quotidien), 6 des 7 compétitions vedettes (pas d'Europa League
  // sur le plan gratuit). Voir packages/football-provider/src/providers/footballDataOrg.ts.
  FOOTBALL_DATA_ORG_API_KEY: z.string().optional().default(""),

  // Highlightly (Sport Highlights API, via RapidAPI) — complète football-data.org
  // avec ce qu'il n'a pas sur son plan gratuit : événements minute par minute
  // (buts/cartons/remplacements), compositions, statistiques. Plan gratuit
  // limité à 100 requêtes/jour — voir apps/worker/src/jobs/syncMatchEvents.ts
  // pour le budget de quota (id Highlightly mis en cache sur Fixture, jamais
  // re-cherché une fois résolu).
  HIGHLIGHTLY_API_KEY: z.string().optional().default(""),

  VIDEO_PROVIDER: z.enum(["stub", "cloudflare-stream"]).default("stub"),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional().default(""),
  CLOUDFLARE_STREAM_API_TOKEN: z.string().optional().default(""),

  // Fournisseurs IA (RexFoot AI) — tous optionnels, essayés dans cet ordre
  // (voir @rexfoot/ai-provider) ; aucun configuré = fonctionnalités IA désactivées.
  GEMINI_API_KEY: z.string().optional().default(""),
  GROQ_API_KEY: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),

  // Notifications WhatsApp aux rédacteurs (début/fin de match, buts) via
  // CallMeBot (gratuit, usage personnel — chaque destinataire doit d'abord
  // ajouter le bot dans ses contacts WhatsApp et obtenir sa propre apikey,
  // voir apps/worker/src/lib/notifyWriters.ts). JSON brut : tableau
  // [{name, phone, apikey}] — laissé en string ici (jamais un schéma zod
  // imbriqué) pour ne jamais faire planter tout le worker au démarrage si
  // Hicham modifie cette variable dans Railway avec une virgule en trop —
  // le parsing tolérant vit dans notifyWriters.ts.
  WHATSAPP_WRITER_NOTIFY_TARGETS: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Valide et retourne process.env une seule fois (mis en cache).
 * Lance une erreur explicite au démarrage si une variable requise manque,
 * plutôt que de faire planter l'app plus tard avec un message obscur.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Variables d'environnement invalides:\n${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function hasFootballApiKey(env: Env = getEnv()): boolean {
  return env.RAPIDAPI_KEY.trim().length > 0;
}

export function hasFootballDataOrgApiKey(env: Env = getEnv()): boolean {
  return env.FOOTBALL_DATA_ORG_API_KEY.trim().length > 0;
}

/** Vrai si un fournisseur de données football (peu importe lequel) est configuré. */
export function hasAnyFootballProviderKey(env: Env = getEnv()): boolean {
  return hasFootballDataOrgApiKey(env) || hasFootballApiKey(env);
}

export function hasCloudflareStreamConfig(env: Env = getEnv()): boolean {
  return env.CLOUDFLARE_ACCOUNT_ID.trim().length > 0 && env.CLOUDFLARE_STREAM_API_TOKEN.trim().length > 0;
}

export function hasHighlightlyApiKey(env: Env = getEnv()): boolean {
  return env.HIGHLIGHTLY_API_KEY.trim().length > 0;
}
