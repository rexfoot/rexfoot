import { prisma } from "@rexfoot/db";
import { getEnv } from "@rexfoot/config";
import { createVideoProvider, VideoProviderError } from "@rexfoot/video-provider";
import {
  renderArticleSlides,
  SLIDE_DURATION_S,
  TITLE_DURATION_S,
  OUTRO_DURATION_S,
} from "./articleVideo/renderSlides.js";
import { buildArticleVideo } from "./articleVideo/buildVideo.js";
import { fetchArticleMusic, MUSIC_ATTRIBUTION } from "./articleVideo/music.js";
import { generateUniqueVideoSlug } from "../lib/slug.js";
import { logger } from "../lib/logger.js";

const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_ATTEMPTS = 30; // 30 × 5s = 2.5 min max

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadToCloudflareStream(video: Buffer, filename: string): Promise<string> {
  const { uploadUrl, providerAssetId } = await createVideoProvider().createDirectUploadUrl({
    filename,
  });

  const form = new FormData();
  form.append("file", new Blob([video], { type: "video/mp4" }), filename);

  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    throw new VideoProviderError(`Échec de l'upload vers Cloudflare Stream (HTTP ${res.status})`);
  }

  return providerAssetId;
}

/**
 * Génère une vidéo à partir d'un article publié :
 * 1. Récupère l'article et son contenu
 * 2. Génère les slides (titre, contenu, outro)
 * 3. Assemble la vidéo avec transitions crossfade et musique de fond
 * 4. Upload vers Cloudflare Stream
 * 5. Crée l'enregistrement Video en base
 *
 * Peut être déclenché manuellement depuis l'admin ou automatiquement
 * après la publication d'un article.
 */
export async function generateArticleVideo(articleId: string): Promise<string | null> {
  // Même raison que generateWeeklyRecap.ts : pas de backend vidéo → pas de
  // génération (le MP4 serait construit pour rien). Déclenchements manuels
  // depuis /admin inclus — l'erreur explicite vient du stub si besoin.
  if (getEnv().VIDEO_PROVIDER !== "cloudflare-stream") {
    logger.info({ articleId }, "Article vidéo : désactivé (pas de fournisseur vidéo configuré), ignoré");
    return null;
  }

  const article = await prisma.newsArticle.findUnique({
    where: { id: articleId },
    include: {
      relatedTeam: { select: { name: true } },
      relatedPlayer: { select: { displayName: true } },
    },
  });

  if (!article) {
    logger.error({ articleId }, "Article vidéo : article introuvable");
    return null;
  }

  if (article.status !== "PUBLISHED") {
    logger.warn({ articleId, status: article.status }, "Article vidéo : article non publié, ignoré");
    return null;
  }

  if (!article.contentHtml || article.contentHtml.trim().length < 50) {
    logger.warn({ articleId }, "Article vidéo : contenu trop court pour générer une vidéo");
    return null;
  }

  logger.info({ articleId, title: article.title }, "Article vidéo : début de génération");

  // Generate slides
  const { slides, totalDurationSeconds } = await renderArticleSlides({
    title: article.title,
    category: article.category,
    contentHtml: article.contentHtml,
    coverImageUrl: article.coverImageUrl,
    teamName: article.relatedTeam?.name,
    playerName: article.relatedPlayer?.displayName,
  });

  logger.info(
    { articleId, slides: slides.length, duration: totalDurationSeconds },
    "Article vidéo : slides générées, assemblage vidéo",
  );

  // Build durations array for each slide
  const durations = [
    TITLE_DURATION_S,
    ...Array.from({ length: slides.length - 2 }, () => SLIDE_DURATION_S),
    OUTRO_DURATION_S,
  ];

  // Fetch background music (best-effort)
  const music = await fetchArticleMusic();

  // Assemble video
  const videoBuffer = await buildArticleVideo(slides, durations, music);
  logger.info(
    { articleId, sizeMb: (videoBuffer.length / 1_000_000).toFixed(1) },
    "Article vidéo : upload vers Cloudflare Stream",
  );

  // Upload to Cloudflare Stream
  const filename = `article-${article.slug}.mp4`;
  const providerAssetId = await uploadToCloudflareStream(videoBuffer, filename);

  // Poll for transcoding completion
  let details = await createVideoProvider().getDetails(providerAssetId);
  for (let attempt = 0; details.status === "PROCESSING" && attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    details = await createVideoProvider().getDetails(providerAssetId);
  }

  if (details.status === "FAILED") {
    logger.error({ providerAssetId }, "Article vidéo : transcodage Cloudflare Stream en échec");
    return null;
  }

  // Find an admin user as uploader
  const uploader = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  const title = article.title;
  const slug = await generateUniqueVideoSlug(title);

  const baseDescription = `Vidéo générée à partir de l'article « ${article.title} » sur RexFoot.`;
  const description = music ? `${baseDescription}\n\n${MUSIC_ATTRIBUTION}` : baseDescription;

  const video = await prisma.video.create({
    data: {
      title,
      slug,
      description,
      uploaderId: uploader?.id,
      providerName: getEnv().VIDEO_PROVIDER,
      providerAssetId,
      playbackUrl: details.playbackUrl,
      thumbnailUrl: details.thumbnailUrl,
      durationSeconds: details.durationSeconds ?? totalDurationSeconds,
      status: details.status,
      moderationStatus: "APPROVED",
      licenseType: "ORIGINAL",
      publishedAt: new Date(),
    },
  });

  logger.info(
    { articleId, videoId: video.id, slug: video.slug, status: details.status },
    "Article vidéo : vidéo publiée",
  );

  return video.slug;
}
