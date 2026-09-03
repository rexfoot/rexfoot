import { prisma } from "@rexfoot/db";
import { getEnv } from "@rexfoot/config";
import { createVideoProvider, VideoProviderError } from "@rexfoot/video-provider";
import { renderMatchSlide, renderTitleSlide } from "./weeklyRecap/renderSlide.js";
import { buildSlideshowVideo } from "./weeklyRecap/buildVideo.js";
import { fetchBackgroundMusic } from "./weeklyRecap/music.js";
import { generateUniqueVideoSlug } from "../lib/slug.js";
import { logger } from "../lib/logger.js";

const MAX_MATCHES = 10;
const RECAP_WINDOW_DAYS = 7;
// Licence gratuite Bensound (bensound.com) : attribution obligatoire dans la
// description — voir music.ts pour la piste et le détail de la licence.
const MUSIC_ATTRIBUTION = "Musique : \"Energy\" par Bensound.com — https://www.bensound.com";
// Le transcodage Cloudflare Stream d'une vidéo aussi courte (~30-45s) prend
// quelques secondes à ~1 minute en pratique — on poll plutôt que de créer la
// fiche en base à l'état PROCESSING et attendre un rafraîchissement manuel
// depuis /admin (ce job ne tourne qu'une fois par semaine, pas de souci de
// concurrence à laisser le job BullMQ prendre son temps).
const POLL_INTERVAL_MS = 5_000;
const POLL_MAX_ATTEMPTS = 24; // 24 × 5s = 2 min max

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadToCloudflareStream(video: Buffer): Promise<string> {
  const { uploadUrl, providerAssetId } = await createVideoProvider().createDirectUploadUrl({
    filename: "weekly-recap.mp4",
  });

  const form = new FormData();
  form.append("file", new Blob([video], { type: "video/mp4" }), "weekly-recap.mp4");

  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    throw new VideoProviderError(`Échec de l'upload vers Cloudflare Stream (HTTP ${res.status})`);
  }

  return providerAssetId;
}

/**
 * Génère et publie un résumé vidéo hebdomadaire (slideshow scores + écussons,
 * données réelles uniquement) à partir des matchs terminés des compétitions
 * vedettes sur les RECAP_WINDOW_DAYS derniers jours. Musique de fond Bensound
 * (licence gratuite avec attribution, voir music.ts) — vidéo muette en repli
 * silencieux si le morceau n'est pas récupérable, jamais bloquant.
 */
export async function generateWeeklyRecap(): Promise<void> {
  const since = new Date();
  since.setDate(since.getDate() - RECAP_WINDOW_DAYS);

  const matches = await prisma.fixture.findMany({
    where: { status: "FINISHED", kickoffAt: { gte: since }, competition: { isActive: true } },
    orderBy: { kickoffAt: "desc" },
    take: MAX_MATCHES,
    select: {
      homeScore: true,
      awayScore: true,
      kickoffAt: true,
      competition: { select: { name: true } },
      homeTeam: { select: { name: true, crestUrl: true } },
      awayTeam: { select: { name: true, crestUrl: true } },
    },
  });

  if (matches.length === 0) {
    logger.info("Résumé hebdo : aucun match terminé cette semaine, run ignoré");
    return;
  }

  const dateRange = `${since.toLocaleDateString("fr-FR")} — ${new Date().toLocaleDateString("fr-FR")}`;
  logger.info({ matches: matches.length }, "Résumé hebdo : génération des slides");

  const slides = [
    await renderTitleSlide(dateRange),
    ...(await Promise.all(
      matches.map((m) =>
        renderMatchSlide({
          competitionName: m.competition.name,
          homeName: m.homeTeam.name,
          awayName: m.awayTeam.name,
          homeScore: m.homeScore ?? 0,
          awayScore: m.awayScore ?? 0,
          homeCrestUrl: m.homeTeam.crestUrl,
          awayCrestUrl: m.awayTeam.crestUrl,
        }),
      ),
    )),
  ];

  const music = await fetchBackgroundMusic();
  logger.info({ withMusic: music !== null }, "Résumé hebdo : assemblage vidéo (ffmpeg)");
  const videoBuffer = await buildSlideshowVideo(slides, music);

  logger.info({ sizeMb: (videoBuffer.length / 1_000_000).toFixed(1) }, "Résumé hebdo : upload vers Cloudflare Stream");
  const providerAssetId = await uploadToCloudflareStream(videoBuffer);

  let details = await createVideoProvider().getDetails(providerAssetId);
  for (let attempt = 0; details.status === "PROCESSING" && attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    details = await createVideoProvider().getDetails(providerAssetId);
  }
  if (details.status === "FAILED") {
    logger.error({ providerAssetId }, "Résumé hebdo : transcodage Cloudflare Stream en échec");
    return;
  }

  const uploader = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const title = `Résumé de la semaine — ${dateRange}`;
  const slug = await generateUniqueVideoSlug(title);

  const baseDescription = `Les résultats de la semaine (${matches.length} matchs) — généré automatiquement à partir des données RexFoot.`;
  const description = music ? `${baseDescription}\n\n${MUSIC_ATTRIBUTION}` : baseDescription;

  await prisma.video.create({
    data: {
      title,
      slug,
      description,
      uploaderId: uploader?.id,
      providerName: getEnv().VIDEO_PROVIDER,
      providerAssetId,
      playbackUrl: details.playbackUrl,
      thumbnailUrl: details.thumbnailUrl,
      durationSeconds: details.durationSeconds,
      status: details.status,
      moderationStatus: "APPROVED",
      licenseType: "ORIGINAL",
      publishedAt: new Date(),
    },
  });

  logger.info({ slug, status: details.status }, "Résumé hebdo : vidéo publiée");
}
