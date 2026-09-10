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
    console.error("Facebook auto-publish: faltan variables de entorno, se omite.");
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
      console.error("Error publicando en Facebook:", data);
    } else {
      console.log("Publicado en Facebook, post id:", data.id);
    }
  } catch (err) {
    console.error("Fallo de red publicando en Facebook:", err);
  }
}
