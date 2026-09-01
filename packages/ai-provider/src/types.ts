export interface AiGenerateRequest {
  /** Instructions de contexte/contraintes — jamais montré à l'utilisateur final. */
  system?: string;
  prompt: string;
  maxTokens?: number;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

/** Un fournisseur de génération de texte (Gemini, Groq, OpenRouter…). */
export interface AiProvider {
  readonly name: string;
  generateText(request: AiGenerateRequest): Promise<string>;
}
