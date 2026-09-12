/**
 * Publie automatiquement un article sur la page Facebook RexFoot via la Graph
 * API (fetch natif, pas de SDK). Best-effort : ne doit jamais faire échouer
 * la publication de l'article sur le site si Facebook est indisponible,
 * renvoie une erreur, ou si les identifiants ne sont pas configurés.
 */
export async function publishToFacebook(article: { title: string; slug: string; summary?: string | null }) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    console.error(
      `[Facebook] Variables FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN manquantes — publication ignorée pour "${article.slug}".`,
    );
    return;
  }

  const message = article.summary ? `${article.title}\n\n${article.summary}` : article.title;

  const url = `https://graph.facebook.com/v26.0/${pageId}/feed`;
  const body = new URLSearchParams({
    message,
    link: `https://rexfoot.com/news/${article.slug}`,
    access_token: accessToken,
  });

  try {
    const res = await fetch(url, { method: "POST", body });
    const data = await res.json();
    if (!res.ok) {
      // Erreur Graph API (token expiré/révoqué, permission manquante, contenu
      // refusé, etc.) : `data.error` contient toujours un message exploitable
      // côté Meta — on le loggue en entier plutôt que de le résumer.
      console.error(
        `[Facebook] Échec de publication pour "${article.slug}" (HTTP ${res.status}):`,
        JSON.stringify(data),
      );
    } else {
      console.log(`[Facebook] Article "${article.slug}" publié avec succès (post id: ${data.id}).`);
    }
  } catch (err) {
    console.error(`[Facebook] Erreur réseau lors de la publication de "${article.slug}":`, err);
  }
}
