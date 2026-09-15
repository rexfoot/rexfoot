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
  try {
    const { admin, response } = await requirePermission(_request, "manageNews");
    if (!admin) return response;

    const { id } = await params;
    console.log(`[article-video] POST /api/admin/news/${id}/generate-video — admin=${admin.id}`);

    const article = await prisma.newsArticle.findUnique({
      where: { id },
      select: { id: true, status: true, title: true, contentHtml: true },
    });

    if (!article) {
      console.warn(`[article-video] Article ${id} introuvable`);
      return apiError(404, "Article introuvable.");
    }

    if (article.status !== "PUBLISHED") {
      console.warn(`[article-video] Article ${id} non publié (status=${article.status})`);
      return apiError(400, "Seuls les articles publiés peuvent être convertis en vidéo.");
    }

    if (!article.contentHtml || article.contentHtml.trim().length < 50) {
      console.warn(`[article-video] Article ${id} contenu trop court (${article.contentHtml?.length ?? 0} chars)`);
      return apiError(400, "Le contenu de l'article est trop court pour générer une vidéo.");
    }

    console.log(`[article-video] Ajout du job BullMQ pour article ${id} — "${article.title}"`);
    await enqueueArticleVideoGeneration(id);
    console.log(`[article-video] Job ajouté avec succès pour article ${id}`);

    return NextResponse.json({
      message: "La génération vidéo a été lancée. La vidéo sera disponible sur /video une fois le traitement terminé.",
    });
  } catch (cause) {
    console.error("[article-video] Erreur dans POST /api/admin/news/[id]/generate-video:", cause);
    return apiError(500, "Erreur interne lors de la génération vidéo.");
  }
}
