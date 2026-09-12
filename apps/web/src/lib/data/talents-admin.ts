import { prisma } from "@rexfoot/db";
import { slugify } from "@/lib/slugify";

/** Toutes les soumissions (tous statuts confondus) pour la liste du panel admin. */
export async function getAllTalentsForAdmin() {
  return prisma.talentProfile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      status: true,
      nationality: true,
      currentCountry: true,
      position: true,
      currentClub: true,
      createdAt: true,
      videoId: true,
    },
  });
}

export async function getTalentByIdForAdmin(id: string) {
  return prisma.talentProfile.findUnique({
    where: { id },
    include: { video: true },
  });
}

/** Même principe que generateUniqueNewsSlug/generateUniqueVideoSlug. */
export async function generateUniqueTalentSlug(firstName: string, lastName: string): Promise<string> {
  const base = slugify(`${firstName} ${lastName}`) || "joueur";
  let candidate = base;
  let suffix = 2;

  while (await prisma.talentProfile.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
