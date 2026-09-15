import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";
import { enqueueArticleVideoGeneration } from "@/lib/video-queue";

/**
 * POST /api/admin/news/[id]/generate-video
 * Déclenche la génération vidéo d'un article publié.
 * Le job est ajouté à la file BullMQ et traité en arrière-plan par le worker.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, response } = await requirePermission(_request, "manageNews");
  if (!admin) return response;

  const { id } = await params;

  const article = await prisma.newsArticle.findUnique({
    where: { id },
    select: { id: true, status: true, title: true, contentHtml: true },
  });

  if (!article) {
    return apiError(404, "Article introuvable.");
  }

  if (article.status !== "PUBLISHED") {
    return apiError(400, "Seuls les articles publiés peuvent être convertis en vidéo.");
  }

  if (!article.contentHtml || article.contentHtml.trim().length < 50) {
    return apiError(400, "Le contenu de l'article est trop court pour générer une vidéo.");
  }

  try {
    await enqueueArticleVideoGeneration(id);
  } catch (cause) {
    console.error("Échec de l'ajout du job vidéo:", cause);
    return apiError(500, "Échec de l'ajout du job de génération vidéo.");
  }

  return NextResponse.json({
    message: "La génération vidéo a été lancée. La vidéo sera disponible sur /video une fois le traitement terminé.",
  });
}
