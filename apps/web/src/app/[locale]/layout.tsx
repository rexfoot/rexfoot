import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, Outfit } from "next/font/google";
import { SITE_NAME } from "@rexfoot/config";
import { routing, isRtl } from "@/i18n/routing";
import { buildAlternates, ogLocale } from "@/lib/seo/alternates";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { AdsenseLazy } from "@/components/AdsenseLazy";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["600", "700", "800"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  // og:image GLOBALE (logo/visuel RexFoot 1200×630) : fichier statique servi
  // en 200 direct, sans redirect (public/, même URL pour les 3 locales —
  // optimal pour les scrapers Facebook/X/WhatsApp et le cache CDN). Les pages
  // avec un visuel propre (cover d'article, thumbnail vidéo) la remplacent
  // via leur propre `openGraph.images` (comportement standard de fusion Next).
  const ogImage = [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: SITE_NAME }];
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("title"), template: `%s | ${SITE_NAME}` },
    description: t("description"),
    alternates: buildAlternates("/", locale),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: t("title"),
      description: t("description"),
      locale: ogLocale(locale),
      alternateLocale: routing.locales.filter((l) => l !== locale).map(ogLocale),
      images: ogImage,
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description"), images: ogImage },
    icons: { icon: "/favicon.ico", apple: `/${locale}/apple-icon.png` },
    verification: { google: "fb3QYMo5tbpDvbzF5eEU2jD9WUlkpa4Quui4Xeud_MU" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// Organization + WebSite : posé une fois ici (racine), pas répété page par
// page — sert de socle au knowledge panel / sitelinks searchbox Google, en
// complément des schémas plus spécifiques (NewsArticle, SportsEvent…) posés
// par chaque page de détail.
function buildRootJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
      logo: `${siteUrl}/logo-crown.png`,
    },
    // Pas de `potentialAction: SearchAction` (sitelinks searchbox) : la
    // recherche n'a pas de page dédiée lisant `?q=` (overlay client + /api/search
    // uniquement) — un SearchAction pointant vers une page qui l'ignore
    // induirait Google en erreur plutôt que d'aider.
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: siteUrl,
    },
  ];
}

// Racine du site public — langue et sens d'écriture dépendent réellement de la
// route (`dir` rendu côté serveur, jamais corrigé après coup en JS : un flash
// LTR→RTL serait exactement l'"élément cassé" à éviter). Plus aucune locale
// RTL depuis le retrait de l'arabe (voir RTL_LOCALES dans i18n/routing.ts),
// mais `isRtl` reste générique plutôt que supprimé.
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildRootJsonLd()) }}
        />
        {/* Tiers différés après le load : zéro impact LCP/FCP (voir point perf PageSpeed). */}
        <GoogleAnalytics />
        <AdsenseLazy />
        <ServiceWorkerRegister />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
