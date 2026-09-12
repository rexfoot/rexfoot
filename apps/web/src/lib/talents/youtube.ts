const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"]);

/** Id vidéo YouTube attendu : 11 caractères alphanumériques/-/_ — sert de garde-fou avant d'accepter une extraction. */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,20}$/;

/**
 * Extrait l'id vidéo d'une URL YouTube collée par un joueur (formats
 * watch?v=, youtu.be/, shorts/, embed/, avec ou sans paramètres additionnels
 * type ?si=... ou &t=...) — renvoie null si l'URL n'est pas reconnue comme
 * une URL YouTube valide, jamais une extraction approximative.
 */
export function parseYoutubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (!YOUTUBE_HOSTS.has(url.hostname)) return null;

  let id: string | null = null;
  if (url.hostname === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] || null;
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else {
    const match = url.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/);
    id = match?.[2] ?? null;
  }

  return id && VIDEO_ID_PATTERN.test(id) ? id : null;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
