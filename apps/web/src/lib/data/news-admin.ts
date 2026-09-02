import { prisma } from "@rexfoot/db";
import { slugify } from "@/lib/slugify";

/** Toutes les actualités (tous statuts confondus) pour la liste du panel admin. */
export async function getAllNewsForAdmin() {
  return prisma.newsArticle.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      status: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
      isBreaking: true,
      breakingSince: true,
      isAiDraft: true,
    },
  });
}

export async function getNewsArticleByIdForAdmin(id: string) {
  return prisma.newsArticle.findUnique({
    where: { id },
    include: { sources: { orderBy: { retrievedAt: "asc" } } },
  });
}

/** Ajoute un suffixe numérique si le slug dérivé du titre existe déjà. */
export async function generateUniqueNewsSlug(title: string): Promise<string> {
  const base = slugify(title) || "article";
  let candidate = base;
  let suffix = 2;

  while (await prisma.newsArticle.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
