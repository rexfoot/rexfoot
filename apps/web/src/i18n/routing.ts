import { defineRouting } from "next-intl/routing";

export const LOCALES = ["fr", "en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const RTL_LOCALES: Locale[] = ["ar"];

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale as Locale);
}

/**
 * "as-needed" : le français (langue par défaut du site) garde des URLs sans
 * préfixe (`/matches`) — aucune des URLs déjà construites/testées ne change.
 * Anglais et arabe sont préfixés (`/en/matches`, `/ar/matches`).
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "fr",
  localePrefix: "as-needed",
});
