import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { apiError, enforceRateLimit } from "@/lib/api-response";
import { generateUniqueTalentSlug } from "@/lib/data/talents-admin";
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

/** Section 5-11 et 22-23 du plan — ni compte ni vidéo à cette étape (voir README de la route WhatsApp). */
const bodySchema = z
  .object({
    firstName: z.string().trim().min(1, "Le prénom est obligatoire."),
    lastName: z.string().trim().min(1, "Le nom est obligatoire."),
    dateOfBirth: z.coerce.date(),
    nationality: z.string().trim().min(1, "La nationalité est obligatoire."),
    currentCountry: z.string().trim().min(1, "Le pays actuel est obligatoire."),
    city: z.string().trim().optional(),
    position: z.enum(TALENT_POSITIONS),
    secondaryPosition: z.enum(TALENT_POSITIONS).optional(),
    preferredFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
    heightCm: z.coerce.number().int().positive().optional(),
    situation: z.enum(["FREE_AGENT", "IN_CLUB", "SEEKING_CLUB", "CONTRACT_ENDING"]),
    currentClub: z.string().trim().optional(),
    targetCountries: z.array(z.enum(TARGET_COUNTRY_CODES)).default([]),
    openToAnyCountry: z.boolean().default(false),
    whatsappNumber: z.string().trim().min(6, "Un numéro WhatsApp valide est requis."),
    contactConsentGiven: z.boolean().default(false),
    consentGiven: z.boolean(),
    parentConsentGiven: z.boolean().default(false),
  })
  .refine((data) => data.targetCountries.length > 0 || data.openToAnyCountry, {
    message: "Choisis au moins un pays, ou « ouvert à toutes les opportunités ».",
    path: ["targetCountries"],
  })
  .refine((data) => data.consentGiven, {
    message: "Le consentement est obligatoire.",
    path: ["consentGiven"],
  });

const MINOR_AGE_THRESHOLD = 18;

function computeAge(dateOfBirth: Date, now: Date): number {
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const hasNotHadBirthdayYet =
    now.getMonth() < dateOfBirth.getMonth() ||
    (now.getMonth() === dateOfBirth.getMonth() && now.getDate() < dateOfBirth.getDate());
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:talents");
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }
  const data = parsed.data;

  const now = new Date();
  const isMinor = computeAge(data.dateOfBirth, now) < MINOR_AGE_THRESHOLD;
  if (isMinor && !data.parentConsentGiven) {
    return apiError(400, "Le consentement du parent ou représentant légal est obligatoire pour un mineur.");
  }

  const slug = await generateUniqueTalentSlug(data.firstName, data.lastName);

  const profile = await prisma.talentProfile.create({
    data: {
      slug,
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
      whatsappNumber: data.whatsappNumber,
      contactConsentGiven: data.contactConsentGiven,
      consentGiven: data.consentGiven,
      consentGivenAt: now,
      isMinor,
      parentConsentGiven: data.parentConsentGiven,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true, id: profile.id });
}
