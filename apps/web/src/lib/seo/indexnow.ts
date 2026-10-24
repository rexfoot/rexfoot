import { routing } from "@/i18n/routing";
import { localizedUrl } from "@/lib/seo/alternates";

// La clé IndexNow est publique par conception : le moteur vérifie qu'elle est
// servie à https://rexfoot.com/<clé>.txt (fichier dans apps/web/public).
const INDEXNOW_KEY = "c5df195926c9f24d05f5e67b035b96d2";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";

/**
 * Signale un article qui vient d'être publié à Bing (et Yandex, Seznam, Naver
 * qui partagent IndexNow), dans les 3 langues — gratuit, sans compte. Google
 * n'utilise pas IndexNow : il passe par sitemap.xml et news-sitemap.xml.
 * Best-effort comme publishToFacebook : ne doit jamais bloquer la publication.
 */
export async function pingIndexNow(slug: string): Promise<void> {
  const urlList = routing.locales.map((locale) => localizedUrl(locale, `/news/${slug}`));
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(siteUrl).host,
        key: INDEXNOW_KEY,
        keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(8000),
    });
    console.log(`[IndexNow] "${slug}" signalé (HTTP ${res.status}).`);
  } catch (error) {
    console.error(`[IndexNow] Échec pour "${slug}":`, error);
  }
}
