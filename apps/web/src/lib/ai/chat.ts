import { createAiProvider } from "@rexfoot/ai-provider";
import { buildChatContext } from "./chat-context";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 6;

/**
 * Répond à une conversation en s'appuyant strictement sur un instantané des
 * données réelles du site (voir buildChatContext) — jamais de score, joueur,
 * transfert ou actualité inventés pour combler une question hors de ces données.
 */
export async function answerChatMessage(history: ChatMessage[]): Promise<string> {
  const trimmedHistory = history.slice(-MAX_HISTORY);
  const context = await buildChatContext();
  const provider = createAiProvider();

  const system = [
    "Tu es l'assistant du site RexFoot, un média d'actualité football.",
    "Réponds dans la langue du dernier message de l'utilisateur si tu peux la détecter, sinon en français.",
    "Utilise EXCLUSIVEMENT les données réelles ci-dessous pour tout ce qui concerne des matchs, des scores, des actualités ou des transferts précis — n'invente JAMAIS un score, un joueur, un transfert, une date ou une actualité qui n'y figure pas.",
    "Si l'information demandée n'est pas dans ces données, dis clairement que tu ne l'as pas encore plutôt que de deviner ou d'extrapoler.",
    "Tu peux discuter de football en général (règles, histoire) avec prudence, mais reste honnête sur les limites de tes informations en temps réel.",
    "Réponds de façon concise : 3 à 4 phrases maximum.",
    "",
    "=== DONNÉES RÉELLES REXFOOT (instantané actuel) ===",
    context,
    "=== FIN DES DONNÉES ===",
  ].join("\n");

  const conversation = trimmedHistory
    .map((message) => `${message.role === "user" ? "Utilisateur" : "Assistant"} : ${message.content}`)
    .join("\n");

  return provider.generateText({
    system,
    prompt: `${conversation}\nAssistant :`,
    maxTokens: 400,
  });
}
