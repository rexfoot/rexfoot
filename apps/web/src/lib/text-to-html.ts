/**
 * Convertit le texte brut saisi dans le formulaire admin (un `<textarea>`, pas
 * d'éditeur riche) en HTML sûr à stocker dans NewsArticle.contentHtml, rendu
 * ensuite via dangerouslySetInnerHTML sur /news/[slug]. Les entités sont
 * échappées avant insertion — jamais de HTML brut venant du formulaire.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

/** Inverse de `textToHtml`, pour préremplir le formulaire d'édition à partir du contenu stocké. */
export function htmlToText(html: string): string {
  return html
    .split(/<\/p>\s*/)
    .map((chunk) => chunk.replace(/^<p>/, "").trim())
    .filter(Boolean)
    .map((chunk) => chunk.replace(/<br\s*\/?>/g, "\n"))
    .join("\n\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
