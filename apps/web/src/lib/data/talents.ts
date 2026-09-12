import { prisma, type TalentPosition, type TalentSituation } from "@rexfoot/db";

const PUBLIC_SELECT = {
  id: true,
  slug: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  nationality: true,
  currentCountry: true,
  city: true,
  position: true,
  secondaryPosition: true,
  preferredFoot: true,
  heightCm: true,
  situation: true,
  currentClub: true,
  targetCountries: true,
  openToAnyCountry: true,
  photoUrl: true,
  about: true,
  status: true,
  contactConsentGiven: true,
  whatsappNumber: true,
  contactClickCount: true,
  video: { select: { playbackUrl: true, thumbnailUrl: true, status: true, providerName: true, providerAssetId: true } },
} as const;

/** 404 pour tout ce qui n'est pas APPROVED — voir getNewsArticleBySlug pour le même principe. */
export async function getApprovedTalentBySlug(slug: string) {
  return prisma.talentProfile.findFirst({
    where: { slug, status: "APPROVED" },
    select: PUBLIC_SELECT,
  });
}

export interface TalentDiscoveryFilters {
  currentCountry?: string;
  nationality?: string;
  position?: TalentPosition;
  situation?: TalentSituation;
  targetCountry?: string;
  minAge?: number;
  maxAge?: number;
  search?: string;
}

/**
 * Chaque filtre actif devient une clause de AND[] plutôt qu'une clé plate —
 * `targetCountry` et `search` ont chacun besoin de leur propre OR interne, et
 * deux clés `OR` au même niveau d'un objet where s'écraseraient l'une l'autre.
 */
export async function getApprovedTalents(filters: TalentDiscoveryFilters) {
  const now = new Date();
  const birthDateBefore = (age: number) => new Date(now.getFullYear() - age, now.getMonth(), now.getDate());

  const and: object[] = [];
  if (filters.currentCountry) and.push({ currentCountry: filters.currentCountry });
  if (filters.nationality) and.push({ nationality: filters.nationality });
  if (filters.position) and.push({ position: filters.position });
  if (filters.situation) and.push({ situation: filters.situation });
  if (filters.targetCountry) {
    and.push({ OR: [{ targetCountries: { has: filters.targetCountry } }, { openToAnyCountry: true }] });
  }
  // minAge=18 -> né avant (aujourd'hui - 18 ans) ; maxAge=25 -> né après (aujourd'hui - 25 ans - 1 jour).
  if (filters.minAge) and.push({ dateOfBirth: { lte: birthDateBefore(filters.minAge) } });
  if (filters.maxAge) and.push({ dateOfBirth: { gte: birthDateBefore(filters.maxAge + 1) } });
  if (filters.search) {
    and.push({
      OR: [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { currentClub: { contains: filters.search, mode: "insensitive" } },
        { nationality: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }

  return prisma.talentProfile.findMany({
    where: { status: "APPROVED", AND: and },
    orderBy: { createdAt: "desc" },
    select: PUBLIC_SELECT,
  });
}
