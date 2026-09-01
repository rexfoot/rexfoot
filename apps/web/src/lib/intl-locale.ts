/** Convertit le code de locale next-intl (fr/en/ar) en tag BCP-47 pour Intl.*/
export function toIntlLocale(locale: string): string {
  switch (locale) {
    case "en":
      return "en-US";
    case "ar":
      return "ar";
    default:
      return "fr-FR";
  }
}
