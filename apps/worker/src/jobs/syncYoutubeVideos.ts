import { XMLParser } from "fast-xml-parser";
import { prisma } from "@rexfoot/db";
import { YOUTUBE_CHANNEL_ID } from "@rexfoot/config";
import { generateUniqueVideoSlug } from "../lib/slug.js";
import { logger } from "../lib/logger.js";

const FETCH_TIMEOUT_MS = 15_000;
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true });

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * La chaîne source (souss-actualités, handle @youblive) n'est pas dédiée au
 * football — elle mélange actu régionale, religion, politique, etc. On ne
 * publie sur RexFoot que les vidéos dont le titre ou la description matche
 * un mot-clé foot, dans les langues effectivement observées sur la chaîne
 * (français, espagnol, arabe) plus l'anglais (site trilingue fr/en/ar).
 * Filtre volontairement simple (substring, pas de NLP) : mieux vaut rater
 * une vidéo ambiguë que publier du contenu hors-sujet sur un site foot.
 */
const FOOTBALL_KEYWORDS = [
  // Français
  "football",
  "foot",
  "match",
  "équipe",
  "ligue",
  "championnat",
  "coupe",
  "mercato",
  "transfert",
  "joueur",
  "entraîneur",
  "but",
  "derby",
  "stade",
  // Español
  "fútbol",
  "futbol",
  "partido",
  "liga",
  "gol",
  "equipo",
  "jugador",
  "entrenador",
  "copa",
  // English
  "soccer",
  "goal",
  "striker",
  "midfielder",
  "premier league",
  // العربية
  "كرة القدم",
  "مباراة",
  "فريق",
  "دوري",
  "هدف",
  "كأس",
  "لاعب",
  "مدرب",
  "ملعب",
] as const;

function isFootballRelated(entry: { title: string; description: string }): boolean {
  const haystack = `${entry.title} ${entry.description}`.toLowerCase();
  return FOOTBALL_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

interface YoutubeEntry {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
}

/**
 * Flux Atom public YouTube pour une chaîne (`/feeds/videos.xml?channel_id=`)
 * — pas de clé API, pas de quota, mais limité aux ~15 dernières vidéos.
 * Suffisant ici : ce job tourne assez souvent pour ne jamais manquer une
 * publication (voir scheduler.ts), donc pas besoin de pagination profonde.
 */
async function fetchChannelEntries(): Promise<YoutubeEntry[]> {
  let response: Response;
  try {
    response = await fetch(FEED_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RexFootBot/1.0)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (cause) {
    logger.warn({ cause }, "Flux YouTube : échec réseau, run ignoré");
    return [];
  }

  if (!response.ok) {
    logger.warn({ status: response.status }, "Flux YouTube : réponse en erreur, run ignoré");
    return [];
  }

  const xml = await response.text();
  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (cause) {
    logger.warn({ cause }, "Flux YouTube : XML illisible, run ignoré");
    return [];
  }

  const rawEntries = toArray((parsed as { feed?: { entry?: unknown } }).feed?.entry) as Array<Record<string, unknown>>;

  return rawEntries
    .map((entry): YoutubeEntry | null => {
      const videoId = entry["yt:videoId"];
      const title = entry.title;
      if (typeof videoId !== "string" || typeof title !== "string") return null;

      const group = entry["media:group"] as Record<string, unknown> | undefined;
      const description = typeof group?.["media:description"] === "string" ? group["media:description"] : "";
      const thumbnail = group?.["media:thumbnail"] as { "@_url"?: string } | undefined;
      const published = typeof entry.published === "string" ? new Date(entry.published) : null;

      return {
        videoId,
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl: thumbnail?.["@_url"] ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
      };
    })
    .filter((entry): entry is YoutubeEntry => entry !== null);
}

/**
 * Synchronise vers /video les vidéos de la chaîne YouTube du propriétaire qui
 * parlent de football (voir isFootballRelated) — jamais de brouillon à
 * valider ici (contrairement à l'agent éditorial) : une vidéo déjà publique
 * sur sa propre chaîne YouTube et suffisamment liée au foot ne présente pas
 * le risque d'invention/erreur factuelle d'un article généré, donc
 * publication directe (status READY, moderationStatus APPROVED).
 */
export async function syncYoutubeVideos(): Promise<void> {
  const entries = await fetchChannelEntries();
  if (entries.length === 0) return;

  const existing = await prisma.video.findMany({
    where: { providerName: "youtube", providerAssetId: { in: entries.map((e) => e.videoId) } },
    select: { providerAssetId: true },
  });
  const existingIds = new Set(existing.map((v) => v.providerAssetId));

  const unseenEntries = entries.filter((e) => !existingIds.has(e.videoId));
  if (unseenEntries.length === 0) return;

  const newEntries = unseenEntries.filter(isFootballRelated);
  const skipped = unseenEntries.length - newEntries.length;
  if (skipped > 0) {
    logger.info({ skipped }, "Flux YouTube : vidéos hors-sujet foot ignorées");
  }
  if (newEntries.length === 0) return;

  const uploader = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });

  for (const entry of newEntries) {
    const slug = await generateUniqueVideoSlug(entry.title);
    await prisma.video.create({
      data: {
        title: entry.title,
        slug,
        description: entry.description || null,
        uploaderId: uploader?.id,
        providerName: "youtube",
        providerAssetId: entry.videoId,
        playbackUrl: `https://www.youtube.com/embed/${entry.videoId}`,
        thumbnailUrl: entry.thumbnailUrl,
        status: "READY",
        moderationStatus: "APPROVED",
        licenseType: "ORIGINAL",
        publishedAt: entry.publishedAt ?? new Date(),
      },
    });
    logger.info({ title: entry.title, videoId: entry.videoId }, "Vidéo YouTube synchronisée");
  }
}
