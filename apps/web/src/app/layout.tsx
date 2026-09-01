import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { SITE_NAME, SITE_TAGLINE } from "@rexfoot/config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["600", "700", "800"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description:
    "RexFoot centralise l'actualité, les matchs en direct, les résultats, les statistiques et la vidéo football international.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "L'actualité, les matchs en direct, les résultats et la vidéo football, dans une seule plateforme.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "L'actualité, les matchs en direct, les résultats et la vidéo football.",
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
