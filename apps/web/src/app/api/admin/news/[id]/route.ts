import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type NewsCategory } from "@rexfoot/db";
import { requireAdmin, apiError } from "@/lib/api-response";
import { storeImageAsset, deleteAssetFromUrl, AssetUploadError } from "@/lib/data/assets";
import { NEWS_CATEGORY_VALUES } from "@/lib/news-categories";
import { textToHtml } from "@/lib/text-to-html";

const fieldsSchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères."),
  category: z.enum(NEWS_CATEGORY_VALUES as [string, ...string[]]),
  summary: z.string().trim().optional(),
  content: z.string().trim().min(10, "Le contenu est trop court."),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin(request);
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

  const { title, category, summary, content, status } = parsed.data;

  await prisma.newsArticle.update({
    where: { id },
    data: {
      title,
      category: category as NewsCategory,
      summary: summary || null,
      contentHtml: textToHtml(content),
      coverImageUrl,
      status,
      publishedAt: status === "PUBLISHED" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requireAdmin(request);
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.newsArticle.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Article introuvable.");

  await prisma.newsArticle.delete({ where: { id } });
  await deleteAssetFromUrl(existing.coverImageUrl);

  return NextResponse.json({ ok: true });
}
