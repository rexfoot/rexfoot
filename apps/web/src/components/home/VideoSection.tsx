import { getTranslations } from "next-intl/server";
import { getPublishedVideos } from "@/lib/data/videos";
import { VideoRail } from "@/components/VideoRail";
import { SectionHeader } from "@/components/SectionHeader";
import type { VideoSummary } from "@/lib/types";

/** Nombre minimum de vidéos « propres » pour afficher la section sur l'accueil. */
const MIN_HOME_VIDEOS = 3;

const NON_FRENCH_WORDS = new Set([
  // anglais
  "the", "that", "were", "was", "with", "and", "of", "to", "is", "are", "impossible", "stop", "best", "goals",
  // espagnol
  "por", "del", "las", "los", "para", "una", "polémica", "portada", "diario", "jugadores", "raíces",
]);

/**
 * Filtre éditorial de l'accueil uniquement (la page /video reste inchangée) :
 * on masque les replays automatiques « Diffusion en direct » et les vidéos
 * dont le titre n'est pas en français, pour une vitrine propre.
 */
function isHomeWorthy(video: VideoSummary): boolean {
  const title = video.title.trim();
  if (/diffusion en direct/i.test(title)) return false;
  if (/[؀-ۿ]/.test(title)) return false; // écriture arabe
  if (/[ñ¿¡]/i.test(title)) return false; // marqueurs espagnols
  const words = title.toLowerCase().split(/[^\p{L}']+/u).filter(Boolean);
  return !words.some((w) => NON_FRENCH_WORDS.has(w));
}

/** Highlights vidéo — fetch isolé pour streamer indépendamment des autres sections. */
export async function VideoSection() {
  const [videos, t] = await Promise.all([getPublishedVideos(30), getTranslations("home")]);
  const homeVideos = videos.filter(isHomeWorthy).slice(0, 10);

  // Moins de 3 vidéos de qualité : on masque toute la section plutôt qu'un rail vide/pauvre.
  if (homeVideos.length < MIN_HOME_VIDEOS) return null;

  return (
    <section>
      <SectionHeader title={t("videoTitle")} href="/video" accent="video" />
      <VideoRail videos={homeVideos} />
    </section>
  );
}
