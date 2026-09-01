import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type NewsCategory, type BreakingPriority } from "@rexfoot/db";
import { requireAdmin, apiError } from "@/lib/api-response";
import { storeImageAsset, AssetUploadError } from "@/lib/data/assets";
import { generateUniqueNewsSlug } from "@/lib/data/news-admin";
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

export async function POST(request: Request) {
  const { admin, response } = await requireAdmin(request);
  if (!admin) return response;

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
  let coverImageUrl: string | null = null;
  if (coverImage instanceof File && coverImage.size > 0) {
    try {
      coverImageUrl = await storeImageAsset(coverImage);
    } catch (error) {
      if (error instanceof AssetUploadError) return apiError(400, error.message);
      throw error;
    }
  }

  const { title, category, summary, content, status, isBreaking, breakingPriority } = parsed.data;
  const slug = await generateUniqueNewsSlug(title);

  const article = await prisma.newsArticle.create({
    data: {
      title,
      slug,
      category: category as NewsCategory,
      summary: summary || null,
      contentHtml: textToHtml(content),
      coverImageUrl,
      authorId: admin.id,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      isBreaking,
      breakingPriority: breakingPriority as BreakingPriority,
      breakingSince: isBreaking ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true, id: article.id });
}
