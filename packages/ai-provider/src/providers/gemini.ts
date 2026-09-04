import { AiProviderError, type AiProvider, type AiGenerateRequest } from "../types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.6-flash";
// gemini-3.6-flash "réfléchit" avant de répondre et ce raisonnement consomme
// des tokens sur le même budget que la réponse elle-même (impossible à
// désactiver sur ce modèle — thinkingBudget: 0 renvoie 400 INVALID_ARGUMENT) :
// sans marge, une demande de résumé court peut épuiser tout le budget en
// réflexion et renvoyer un texte vide plutôt que tronqué.
const THINKING_TOKEN_HEADROOM = 4096;
// Le temps de réflexion varie fortement selon la complexité du raisonnement
// demandé, pas seulement la taille du prompt — un simple "réponds OK" revient
// en <1s, mais une extraction JSON avec plusieurs règles conditionnelles peut
// dépasser 20s même sur un texte source de quelques lignes (mesuré : 20004ms,
// donc bien le timeout qui coupe, pas un vrai échec réseau — voir
// apps/worker/src/jobs/editorial/extractTransfers.ts qui a révélé ce cas).
const REQUEST_TIMEOUT_MS = 45_000;

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL,
  ) {}

  async generateText(request: AiGenerateRequest): Promise<string> {
    const url = `${BASE_URL}/${this.model}:generateContent?key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
          contents: [{ parts: [{ text: request.prompt }] }],
          generationConfig: { maxOutputTokens: (request.maxTokens ?? 700) + THINKING_TOKEN_HEADROOM },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new AiProviderError("Échec réseau vers Gemini", cause);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AiProviderError(`Gemini a répondu ${response.status}${text ? `: ${text}` : ""}`);
    }

    const body = (await response.json()) as GeminiResponse;
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new AiProviderError("Gemini a renvoyé une réponse vide");
    return text;
  }
}
