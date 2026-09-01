import type { AiProvider, AiGenerateRequest } from "../types";
import { requestOpenAiCompatible } from "./openAiCompatible";

const BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export class GroqProvider implements AiProvider {
  readonly name = "groq";

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
      providerName: "Groq",
    });
  }
}
