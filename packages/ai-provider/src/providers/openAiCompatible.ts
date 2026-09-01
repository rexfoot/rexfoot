import { AiProviderError, type AiGenerateRequest } from "../types";

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Groq et OpenRouter exposent tous les deux une API "chat completions"
 * compatible OpenAI — un seul client suffit, seuls l'URL de base, le modèle
 * et d'éventuels headers changent d'un fournisseur à l'autre.
 */
export async function requestOpenAiCompatible(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  request: AiGenerateRequest;
  extraHeaders?: Record<string, string>;
  providerName: string;
}): Promise<string> {
  const { baseUrl, apiKey, model, request, extraHeaders, providerName } = options;

  const messages = [
    ...(request.system ? [{ role: "system", content: request.system }] : []),
    { role: "user", content: request.prompt },
  ];

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({ model, messages, max_tokens: request.maxTokens ?? 700 }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new AiProviderError(`Échec réseau vers ${providerName}`, cause);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new AiProviderError(`${providerName} a répondu ${response.status}${text ? `: ${text}` : ""}`);
  }

  const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AiProviderError(`${providerName} a renvoyé une réponse vide`);
  return text;
}
