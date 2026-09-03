import { logger } from "../../lib/logger.js";

// Bensound (bensound.com) : licence gratuite avec attribution obligatoire —
// voir MUSIC_ATTRIBUTION dans generateWeeklyRecap.ts, ajoutée systématiquement
// à la description de la vidéo publiée. Piste "Energy" (instrumental, rythmé)
// choisie pour un résumé de scores sportif. Leur CDN bloque les requêtes sans
// User-Agent/Referer de navigateur (anti-hotlink basique, pas une protection
// contre l'usage sous licence) — d'où les en-têtes ci-dessous.
const TRACK_URL = "https://www.bensound.com/bensound-music/bensound-energy.mp3";

/** best-effort : jamais bloquant — une vidéo muette vaut mieux qu'un run en échec pour un fond musical. */
export async function fetchBackgroundMusic(): Promise<Buffer | null> {
  try {
    const res = await fetch(TRACK_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.bensound.com/",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Résumé hebdo : musique de fond indisponible, vidéo muette");
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (cause) {
    logger.warn({ cause }, "Résumé hebdo : échec récupération musique de fond, vidéo muette");
    return null;
  }
}
