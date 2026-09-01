import { createAiProvider } from "@rexfoot/ai-provider";

const MAX_CONTENT_CHARS = 6000;

/**
 * Rédige un brouillon pour le champ "summary" de l'admin — jamais publié
 * automatiquement : la personne qui écrit relit/édite avant d'enregistrer
 * (voir le bouton "Générer avec l'IA" dans NewsForm).
 */
export async function generateArticleSummary(title: string, plainTextContent: string): Promise<string> {
  const provider = createAiProvider();

  return provider.generateText({
    system:
      "Tu es un assistant éditorial pour un média sportif francophone. Résume STRICTEMENT à partir du texte fourni, sans ajouter aucun fait, chiffre, nom ou résultat qui n'y figure pas. Si une information est absente du texte, ne l'invente jamais. Réponds uniquement avec le résumé, sans guillemets ni préambule.",
    prompt: `Titre : ${title}\n\nArticle :\n${plainTextContent.slice(0, MAX_CONTENT_CHARS)}\n\nRésume cet article en une ou deux phrases (250 caractères maximum), en français.`,
    maxTokens: 200,
  });
}
