import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";

const OG_LOCALES: Record<string, string> = { fr: "fr_FR", en: "en_US", ar: "ar_SA" };

/** Code de langue attendu par `openGraph.locale` (`fr_FR`, pas `fr`). */
export function ogLocale(locale: string): string {
  return OG_LOCALES[locale] ?? locale;
}

/**
 * URL absolue localisée pour une route — les segments ne sont pas traduits
 * (pas de `pathnames` dans routing.ts), seul le préfixe de langue change.
 */
export function localizedUrl(locale: string, pathname: string): string {
  return `${siteUrl}${getPathname({ href: pathname, locale })}`;
}

/**
 * `alternates.canonical` + hreflang (`languages`, avec `x-default` sur le
 * français) pour une route donnée, à poser dans le `generateMetadata` de
 * chaque page publique.
 */
export function buildAlternates(pathname: string, currentLocale: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = localizedUrl(locale, pathname);
  }
  return {
    canonical: languages[currentLocale] ?? languages[routing.defaultLocale],
    languages: { ...languages, "x-default": languages[routing.defaultLocale] },
  };
}
