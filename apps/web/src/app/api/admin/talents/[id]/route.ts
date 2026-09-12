import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";
import { storeImageAsset, deleteAssetFromUrl, AssetUploadError } from "@/lib/data/assets";
import { TARGET_COUNTRIES } from "@/lib/talents/target-countries";

const TALENT_POSITIONS = [
  "GOALKEEPER",
  "CENTRE_BACK",
  "RIGHT_BACK",
  "LEFT_BACK",
  "DEFENSIVE_MIDFIELDER",
  "CENTRE_MIDFIELDER",
  "ATTACKING_MIDFIELDER",
  "RIGHT_WINGER",
  "LEFT_WINGER",
  "STRIKER",
] as const;

const TARGET_COUNTRY_CODES = TARGET_COUNTRIES.map((c) => c.code) as [string, ...string[]];

/** Champs modifiables par l'admin (section 20 du plan) — le consentement/mineur ne se retouche jamais ici. */
const fieldsSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  dateOfBirth: z.coerce.date(),
  nationality: z.string().trim().min(1),
  currentCountry: z.string().trim().min(1),
  city: z.string().trim().optional(),
  position: z.enum(TALENT_POSITIONS),
  secondaryPosition: z.enum(TALENT_POSITIONS).optional(),
  preferredFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  heightCm: z.coerce.number().int().positive().optional(),
  situation: z.enum(["FREE_AGENT", "IN_CLUB", "SEEKING_CLUB", "CONTRACT_ENDING"]),
  currentClub: z.string().trim().optional(),
  targetCountries: z.array(z.enum(TARGET_COUNTRY_CODES)),
  openToAnyCountry: z.boolean(),
  about: z.string().trim().optional(),
  contactConsentGiven: z.boolean(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "HIDDEN"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageTalents");
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.talentProfile.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Profil introuvable.");

  const formData = await request.formData();
  const parsed = fieldsSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth"),
    nationality: formData.get("nationality"),
    currentCountry: formData.get("currentCountry"),
    city: formData.get("city") || undefined,
    position: formData.get("position"),
    secondaryPosition: formData.get("secondaryPosition") || undefined,
    preferredFoot: formData.get("preferredFoot") || undefined,
    heightCm: formData.get("heightCm") || undefined,
    situation: formData.get("situation"),
    currentClub: formData.get("currentClub") || undefined,
    targetCountries: formData.getAll("targetCountries"),
    openToAnyCountry: formData.get("openToAnyCountry") === "on",
    about: formData.get("about") || undefined,
    contactConsentGiven: formData.get("contactConsentGiven") === "on",
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }
  const data = parsed.data;

  const photo = formData.get("photo");
  let photoUrl = existing.photoUrl;
  if (photo instanceof File && photo.size > 0) {
    try {
      const newUrl = await storeImageAsset(photo);
      await deleteAssetFromUrl(existing.photoUrl);
      photoUrl = newUrl;
    } catch (error) {
      if (error instanceof AssetUploadError) return apiError(400, error.message);
      throw error;
    }
  }

  const justModerated = data.status !== existing.status;

  await prisma.talentProfile.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      nationality: data.nationality,
      currentCountry: data.currentCountry,
      city: data.city || null,
      position: data.position,
      secondaryPosition: data.secondaryPosition,
      preferredFoot: data.preferredFoot,
      heightCm: data.heightCm,
      situation: data.situation,
      currentClub: data.currentClub || null,
      targetCountries: data.targetCountries,
      openToAnyCountry: data.openToAnyCountry,
      about: data.about || null,
      photoUrl,
      contactConsentGiven: data.contactConsentGiven,
      status: data.status,
      moderatedAt: justModerated ? new Date() : existing.moderatedAt,
      moderatedById: justModerated ? admin.id : existing.moderatedById,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageTalents");
  if (!admin) return response;

  const { id } = await params;
  const existing = await prisma.talentProfile.findUnique({ where: { id } });
  if (!existing) return apiError(404, "Profil introuvable.");

  await prisma.talentProfile.delete({ where: { id } });
  await deleteAssetFromUrl(existing.photoUrl);

  return NextResponse.json({ ok: true });
}
