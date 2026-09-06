/**
 * Date de publication formatée pour les cartes/hero actu (`null` si pas encore
 * publié). Fuseau fixe (voir MatchCard.tsx) : évite un mismatch d'hydratation
 * serveur/navigateur pour les articles publiés près de minuit UTC.
 */
export function formatArticleDate(date: Date | null, locale: string): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(date);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "il y a 3h" / "3h ago" / "منذ 3 س" — utilisé pour l'horodatage des notifications. */
export function formatRelativeTime(date: Date, locale: string): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= secondsInUnit) {
      return formatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return formatter.format(0, "second");
}
