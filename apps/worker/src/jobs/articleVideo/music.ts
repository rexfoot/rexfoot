import { logger } from "../../lib/logger.js";

// Bensound (bensound.com) : licence gratuite avec attribution obligatoire.
// Piste "Dreams" — douce et contemplative, adaptée à des vidéos d'articles.
// Même CDN que weeklyRecap/music.ts, même User-Agent/Referer anti-hotlink basique.
const TRACK_URL = "https://www.bensound.com/bensound-music/bensound-dreams.mp3";

export const MUSIC_ATTRIBUTION = 'Musique : "Dreams" par Bensound.com — https://www.bensound.com';

/** best-effort : jamais bloquant — une vidéo muette vaut mieux qu'un run en échec. */
export async function fetchArticleMusic(): Promise<Buffer | null> {
  try {
    const res = await fetch(TRACK_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.bensound.com/",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Article vidéo : musique de fond indisponible, vidéo muette");
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (cause) {
    logger.warn({ cause }, "Article vidéo : échec récupération musique de fond, vidéo muette");
    return null;
  }
}
