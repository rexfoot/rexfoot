/**
 * Même logique que apps/web/src/lib/text-to-html.ts (dupliquée à dessein :
 * pas de package partagé pour trois lignes, les deux apps ne s'importent
 * jamais l'une l'autre). Convertit le texte brut renvoyé par le modèle en
 * HTML sûr pour NewsArticle.contentHtml — entités échappées avant insertion.
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
