import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inter, Outfit } from "next/font/google";
import { SITE_NAME } from "@rexfoot/config";
import { routing, isRtl } from "@/i18n/routing";
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

  return {
    metadataBase: new URL(siteUrl),
    title: { default: t("title"), template: `%s | ${SITE_NAME}` },
    description: t("description"),
    openGraph: { type: "website", siteName: SITE_NAME, title: t("title"), description: t("description") },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    icons: { icon: "/favicon.ico" },
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

// Racine du site public — langue et sens d'écriture dépendent réellement de la
// route (`dir="rtl"` rendu côté serveur pour l'arabe, jamais corrigé après coup
// en JS : un flash LTR→RTL serait exactement l'"élément cassé" à éviter).
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
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
