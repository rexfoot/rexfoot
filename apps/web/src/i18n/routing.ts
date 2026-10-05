import { defineRouting } from "next-intl/routing";

export const LOCALES = ["fr", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/// Plus aucune locale RTL depuis le retrait de l'arabe — gardé générique
/// (plutôt que supprimé partout) au cas où une locale RTL reviendrait un jour.
export const RTL_LOCALES: Locale[] = [];

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}

/**
 * "as-needed" : le français (langue par défaut du site) garde des URLs sans
 * préfixe (`/matches`) — aucune des URLs déjà construites/testées ne change.
 * Anglais et espagnol sont préfixés (`/en/matches`, `/es/matches`).
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "fr",
  localePrefix: "as-needed",
  // Pas de détection auto : elle faisait rediriger `/` → `/en` (ou `/es`)
  // selon Accept-Language (~1 s perdue sur PageSpeed, testé depuis les US).
  // `/` sert toujours le français sans redirect ; EN/ES via /en, /es et le
  // sélecteur de langue. Les alternates hreflang restent posées (SEO).
  localeDetection: false,
});
