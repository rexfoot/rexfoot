/** Convertit le code de locale next-intl (fr/en/es) en tag BCP-47 pour Intl.*/
export function toIntlLocale(locale: string): string {
  switch (locale) {
    case "en":
      return "en-US";
    case "es":
      return "es-ES";
    default:
      return "fr-FR";
  }
}
