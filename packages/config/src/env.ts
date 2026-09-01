import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  REDIS_URL: z.string().min(1, "REDIS_URL est requis"),

  RAPIDAPI_KEY: z.string().optional().default(""),
  RAPIDAPI_HOST: z.string().default("v3.football.api-sports.io"),

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

export function hasCloudflareStreamConfig(env: Env = getEnv()): boolean {
  return env.CLOUDFLARE_ACCOUNT_ID.trim().length > 0 && env.CLOUDFLARE_STREAM_API_TOKEN.trim().length > 0;
}
