/** Date de publication formatée pour les cartes/hero actu (`null` si pas encore publié). */
export function formatArticleDate(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
