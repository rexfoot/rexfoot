import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@rexfoot/db";
import { getEnv } from "@rexfoot/config";
import { createVideoProvider, VideoProviderError } from "@rexfoot/video-provider";
import { requirePermission, apiError } from "@/lib/api-response";
import { generateUniqueVideoSlug } from "@/lib/data/videos-admin";

const bodySchema = z.object({
  title: z.string().trim().min(3, "Le titre doit contenir au moins 3 caractères."),
  description: z.string().trim().optional(),
});

/** Crée la fiche vidéo et renvoie l'URL d'upload direct Cloudflare Stream (le fichier ne passe pas par ce serveur). */
export async function POST(request: Request) {
  const { admin, response } = await requirePermission(request, "manageVideos");
  if (!admin) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }
  const { title, description } = parsed.data;

  let uploadUrl: string;
  let providerAssetId: string;
  try {
    const provider = createVideoProvider();
    const result = await provider.createDirectUploadUrl({ filename: title });
    uploadUrl = result.uploadUrl;
    providerAssetId = result.providerAssetId;
  } catch (error) {
    if (error instanceof VideoProviderError) return apiError(400, error.message);
    throw error;
  }

  const slug = await generateUniqueVideoSlug(title);
  const video = await prisma.video.create({
    data: {
      title,
      slug,
      description: description || null,
      uploaderId: admin.id,
      providerName: getEnv().VIDEO_PROVIDER,
      providerAssetId,
      status: "UPLOADING",
      moderationStatus: "APPROVED",
      publishedAt: new Date(),
    },
  });

  return NextResponse.json({ id: video.id, uploadUrl });
}
