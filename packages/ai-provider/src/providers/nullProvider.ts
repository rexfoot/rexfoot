import { AiProviderError, type AiProvider, type AiGenerateRequest } from "../types";

/**
 * Utilisé tant qu'aucune clé IA n'est configurée. Échoue explicitement plutôt
 * que d'inventer un texte — même logique que NullFootballProvider, mais un
 * texte manquant côté IA doit rester visible comme une erreur, jamais comme
 * un résumé vide silencieusement affiché à la place d'un vrai résumé.
 */
export class NullAiProvider implements AiProvider {
  readonly name = "null";

  async generateText(_request: AiGenerateRequest): Promise<string> {
    throw new AiProviderError(
      "Aucun fournisseur IA configuré (GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY).",
    );
  }
}
