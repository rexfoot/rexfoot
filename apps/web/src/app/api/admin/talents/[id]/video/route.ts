import { NextResponse } from "next/server";
import { prisma } from "@rexfoot/db";
import { getEnv } from "@rexfoot/config";
import { createVideoProvider, VideoProviderError } from "@rexfoot/video-provider";
import { requirePermission, apiError } from "@/lib/api-response";

/**
 * Même mécanique que POST /api/admin/videos (upload direct Cloudflare Stream,
 * le fichier ne passe jamais par ce serveur), avec deux différences : la vidéo
 * arrive par WhatsApp (jamais par un formulaire public, voir section 10 du
 * plan) — c'est l'admin qui la re-uploade ici depuis son téléphone/PC après
 * réception — et moderationStatus reste PENDING (pas APPROVED comme pour les
 * vidéos "officielles" du site) tant que l'admin ne valide pas le profil.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageTalents");
  if (!admin) return response;

  const { id } = await params;
  const talent = await prisma.talentProfile.findUnique({ where: { id } });
  if (!talent) return apiError(404, "Profil introuvable.");

  // Remplacement d'une vidéo déjà attachée (mauvais fichier envoyé, nouvelle
  // vidéo plus récente…) : on repart d'une fiche Video propre plutôt que de
  // réutiliser l'ancienne — évite un conflit sur le slug unique ci-dessous.
  if (talent.videoId) {
    const oldVideo = await prisma.video.findUnique({ where: { id: talent.videoId } });
    await prisma.talentProfile.update({ where: { id }, data: { videoId: null } });
    if (oldVideo) {
      try {
        if (oldVideo.providerAssetId) await createVideoProvider().delete(oldVideo.providerAssetId);
      } catch {
        // best-effort — la fiche est supprimée ci-dessous même si le fournisseur échoue.
      }
      await prisma.video.delete({ where: { id: oldVideo.id } }).catch(() => {});
    }
  }

  let uploadUrl: string;
  let providerAssetId: string;
  try {
    const provider = createVideoProvider();
    const result = await provider.createDirectUploadUrl({ filename: `${talent.firstName}-${talent.lastName}` });
    uploadUrl = result.uploadUrl;
    providerAssetId = result.providerAssetId;
  } catch (error) {
    if (error instanceof VideoProviderError) return apiError(400, error.message);
    throw error;
  }

  const video = await prisma.video.create({
    data: {
      title: `${talent.firstName} ${talent.lastName} — RexFoot Talents`,
      slug: `talent-${talent.slug}`,
      uploaderId: admin.id,
      providerName: getEnv().VIDEO_PROVIDER,
      providerAssetId,
      status: "UPLOADING",
      moderationStatus: "PENDING",
    },
  });

  await prisma.talentProfile.update({ where: { id }, data: { videoId: video.id } });

  return NextResponse.json({ id: video.id, uploadUrl });
}
