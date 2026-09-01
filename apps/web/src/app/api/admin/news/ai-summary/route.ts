import { NextResponse } from "next/server";
import { z } from "zod";
import { AiProviderError } from "@rexfoot/ai-provider";
import { requirePermission, apiError } from "@/lib/api-response";
import { generateArticleSummary } from "@/lib/ai/summarize-article";

const bodySchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères."),
  content: z.string().trim().min(10, "Le contenu est trop court."),
});

/** Brouillon de résumé IA pour le formulaire admin — jamais enregistré directement, l'admin doit relire et sauvegarder. */
export async function POST(request: Request) {
  const { admin, response } = await requirePermission(request, "manageNews");
  if (!admin) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, parsed.error.issues[0]?.message ?? "Requête invalide.");

  try {
    const summary = await generateArticleSummary(parsed.data.title, parsed.data.content);
    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof AiProviderError) return apiError(502, error.message);
    throw error;
  }
}
