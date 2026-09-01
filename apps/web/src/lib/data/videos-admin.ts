import { prisma } from "@rexfoot/db";
import { slugify } from "@/lib/slugify";

/** Toutes les vidéos (tous statuts confondus) pour la liste du panel admin. */
export async function getAllVideosForAdmin() {
  return prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      thumbnailUrl: true,
      durationSeconds: true,
      publishedAt: true,
      createdAt: true,
    },
  });
}

export async function getVideoByIdForAdmin(id: string) {
  return prisma.video.findUnique({ where: { id } });
}

export async function generateUniqueVideoSlug(title: string): Promise<string> {
  const base = slugify(title) || "video";
  let candidate = base;
  let suffix = 2;

  while (await prisma.video.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
