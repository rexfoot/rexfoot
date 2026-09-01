import { getEnv, type Env } from "@rexfoot/config";
import { AiProviderError, type AiProvider, type AiGenerateRequest } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { OpenRouterProvider } from "./providers/openrouter";
import { NullAiProvider } from "./providers/nullProvider";

export * from "./types";
export { GeminiProvider } from "./providers/gemini";
export { GroqProvider } from "./providers/groq";
export { OpenRouterProvider } from "./providers/openrouter";
export { NullAiProvider } from "./providers/nullProvider";

/**
 * Essaie chaque fournisseur configuré dans l'ordre et ne passe au suivant
 * qu'en cas d'échec réel (clé absente, quota dépassé, erreur réseau/timeout).
 * Si tous échouent, l'appelant reçoit une erreur explicite — jamais de texte
 * vide ou inventé pour masquer une panne des trois fournisseurs à la fois.
 */
class FallbackAiProvider implements AiProvider {
  readonly name = "fallback";

  constructor(private readonly providers: AiProvider[]) {}

  async generateText(request: AiGenerateRequest): Promise<string> {
    const errors: string[] = [];
    for (const provider of this.providers) {
      try {
        return await provider.generateText(request);
      } catch (error) {
        errors.push(`${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new AiProviderError(`Tous les fournisseurs IA ont échoué — ${errors.join(" | ")}`);
  }
}

let cachedProvider: AiProvider | undefined;

export function hasAiProviderConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.GEMINI_API_KEY || env.GROQ_API_KEY || env.OPENROUTER_API_KEY);
}

/** Point d'entrée unique utilisé par apps/web pour obtenir un AiProvider prêt à l'emploi. */
export function createAiProvider(): AiProvider {
  if (cachedProvider) return cachedProvider;

  const env = getEnv();
  const providers: AiProvider[] = [];
  if (env.GEMINI_API_KEY) providers.push(new GeminiProvider(env.GEMINI_API_KEY));
  if (env.GROQ_API_KEY) providers.push(new GroqProvider(env.GROQ_API_KEY));
  if (env.OPENROUTER_API_KEY) providers.push(new OpenRouterProvider(env.OPENROUTER_API_KEY));

  cachedProvider = providers.length > 0 ? new FallbackAiProvider(providers) : new NullAiProvider();
  return cachedProvider;
}
