import { NextResponse } from "next/server";
import { prisma, type ArticleLocale } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";

const VALID_LOCALES: readonly string[] = ["EN", "ES"];

/**
 * POST /api/admin/news/[id]/translations/[locale]/publish
 * Publie une traduction déjà générée par l'agent éditorial (voir
 * apps/worker/src/jobs/editorial/translateArticle.ts) — geste humain minimal,
 * même philosophie que la publication de l'article FR original : la
 * traduction elle-même n'est jamais publiée automatiquement.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; locale: string }> },
) {
  try {
    const { admin, response } = await requirePermission(request, "manageNews");
    if (!admin) return response;

    const { id, locale } = await params;
    if (!VALID_LOCALES.includes(locale)) {
      return apiError(400, "Langue invalide.");
    }

    const translation = await prisma.articleTranslation.findUnique({
      where: { articleId_locale: { articleId: id, locale: locale as ArticleLocale } },
    });
    if (!translation) {
      return apiError(404, "Traduction introuvable.");
    }

    await prisma.articleTranslation.update({
      where: { id: translation.id },
      data: { status: "PUBLISHED" },
    });

    return NextResponse.json({ message: "Traduction publiée." });
  } catch (cause) {
    console.error("[translations] Erreur dans POST .../translations/[locale]/publish:", cause);
    return apiError(500, "Erreur interne lors de la publication de la traduction.");
  }
}
