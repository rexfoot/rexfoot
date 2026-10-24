/**
 * Convertit le texte brut saisi dans le formulaire admin (un `<textarea>`, pas
 * d'éditeur riche) en HTML sûr à stocker dans NewsArticle.contentHtml, rendu
 * ensuite via dangerouslySetInnerHTML sur /news/[slug]. Les entités sont
 * échappées avant insertion — jamais de HTML brut venant du formulaire.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Liens dans le texte : « [Souss Actualités](https://…) » ou une adresse
// https:// seule. Appliqué APRÈS l'échappement : seules des URL http(s) sans
// guillemet ni chevron peuvent devenir un href, jamais du HTML arbitraire.
const MARKDOWN_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s()"<>]+)\)/g;
const BARE_URL = /(^|[\s(])(https?:\/\/[^\s"<>]+[^\s"<>.,;:!?)])/g;

function linkify(escaped: string): string {
  return escaped
    .replace(MARKDOWN_LINK, (_m, label: string, url: string) => `<a href="${url}">${label}</a>`)
    .replace(BARE_URL, (_m, before: string, url: string) => `${before}<a href="${url}">${url}</a>`);
}

export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${linkify(escapeHtml(paragraph)).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

/** Inverse de `textToHtml`, pour préremplir le formulaire d'édition à partir du contenu stocké. */
export function htmlToText(html: string): string {
  return html
    .split(/<\/p>\s*/)
    .map((chunk) => chunk.replace(/^<p>/, "").trim())
    .filter(Boolean)
    .map((chunk) => chunk.replace(/<br\s*\/?>/g, "\n"))
    .map((chunk) =>
      chunk.replace(/<a href="([^"]*)">([^<]*)<\/a>/g, (_m, url: string, label: string) =>
        label === url ? url : `[${label}](${url})`,
      ),
    )
    .join("\n\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
