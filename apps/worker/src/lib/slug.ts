import { prisma } from "@rexfoot/db";

/** Même logique que apps/web/src/lib/slugify.ts (dupliquée à dessein, voir textToHtml.ts). */
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Même logique que generateUniqueNewsSlug côté web — ajoute un suffixe numérique en cas de collision. */
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
