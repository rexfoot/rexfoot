import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type NewsCategory, type BreakingPriority } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";
import { storeImageAsset, deleteAssetFromUrl, AssetUploadError } from "@/lib/data/assets";
import { notifyBreakingNews } from "@/lib/data/notifications-admin";
import { NEWS_CATEGORY_VALUES } from "@/lib/news-categories";
import { textToHtml } from "@/lib/text-to-html";

const fieldsSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères."),
  category: z.enum(NEWS_CATEGORY_VALUES as [string, ...string[]]),
  summary: z.string().trim().optional(),
  content: z.string().trim().min(10, "Le contenu est trop court."),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  isBreaking: z.boolean(),
  breakingPriority: z.enum(["HIGH", "URGENT"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageNews");
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.newsArticle.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Article introuvable.");

  const formData = await request.formData();
  const parsed = fieldsSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary") || undefined,
    content: formData.get("content"),
    status: formData.get("status"),
    isBreaking: formData.get("isBreaking") === "on",
    breakingPriority: formData.get("breakingPriority") || "HIGH",
  });
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  const coverImage = formData.get("coverImage");
  let coverImageUrl = existing.coverImageUrl;
  if (coverImage instanceof File && coverImage.size > 0) {
    try {
      const newUrl = await storeImageAsset(coverImage);
      await deleteAssetFromUrl(existing.coverImageUrl);
      coverImageUrl = newUrl;
    } catch (error) {
      if (error instanceof AssetUploadError) return apiError(400, error.message);
      throw error;
    }
  }

  const { title, category, summary, content, status, isBreaking, breakingPriority } = parsed.data;

  // Le chrono des 24h repart uniquement quand isBreaking passe de false à true —
  // le laisser actif entre deux modifications ne doit pas relancer la fenêtre.
  let breakingSince = existing.breakingSince;
  if (isBreaking && !existing.isBreaking) breakingSince = new Date();
  if (!isBreaking) breakingSince = null;

  const updated = await prisma.newsArticle.update({
    where: { id },
    data: {
      title,
      category: category as NewsCategory,
      summary: summary || null,
      contentHtml: textToHtml(content),
      coverImageUrl,
      status,
      publishedAt: status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      // Brouillons de l'agent éditorial : jamais d'auteur assigné à la création
      // (voir runEditorialDigest.ts). On l'attribue à la personne qui relit/
      // valide dans l'admin, sans jamais écraser un auteur déjà présent.
      authorId: existing.authorId ?? admin.id,
      isBreaking,
      breakingPriority: breakingPriority as BreakingPriority,
      breakingSince,
    },
  });

  // Ne notifie que quand l'alerte devient visible pour la première fois : soit
  // le chrono breaking vient de démarrer, soit l'article passe de brouillon à
  // publié alors qu'il était déjà marqué breaking — jamais à chaque modification
  // d'une alerte déjà publiée et active.
  const justBecameBreaking =
    status === "PUBLISHED" && isBreaking && (existing.status !== "PUBLISHED" || breakingSince !== existing.breakingSince);
  if (justBecameBreaking) {
    await notifyBreakingNews(updated);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "deleteNews");
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.newsArticle.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Article introuvable.");

  await prisma.newsArticle.delete({ where: { id } });
  await deleteAssetFromUrl(existing.coverImageUrl);

  return NextResponse.json({ ok: true });
}
