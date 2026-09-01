import { NextResponse } from "next/server";
import { z } from "zod";
import { AiProviderError } from "@rexfoot/ai-provider";
import { apiError, enforceRateLimit } from "@/lib/api-response";
import { answerChatMessage, type ChatMessage } from "@/lib/ai/chat";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(20),
});

/** Chat public — ouvert à tous les visiteurs (pas de compte requis), protégé par le rate limiting standard. */
export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:chat");
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Message invalide.");

  try {
    const reply = await answerChatMessage(parsed.data.messages as ChatMessage[]);
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof AiProviderError) return apiError(502, error.message);
    throw error;
  }
}
