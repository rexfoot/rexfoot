import type { AiProvider, AiGenerateRequest } from "../types";
import { requestOpenAiCompatible } from "./openAiCompatible";

const BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export class OpenRouterProvider implements AiProvider {
  readonly name = "openrouter";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL,
  ) {}

  async generateText(request: AiGenerateRequest): Promise<string> {
    return requestOpenAiCompatible({
      baseUrl: BASE_URL,
      apiKey: this.apiKey,
      model: this.model,
      request,
      providerName: "OpenRouter",
      // Exigés par OpenRouter pour les modèles gratuits, sinon requêtes silencieusement dépriorisées.
      extraHeaders: { "HTTP-Referer": "https://rexfoot.com", "X-Title": "RexFoot" },
    });
  }
}
