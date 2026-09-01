import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { SITE_NAME } from "@rexfoot/config";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["600", "700", "800"] });

// Racine dédiée à /admin — jamais localisé (panel interne, langue fixe),
// donc pas de next-intl ici. Voir app/[locale]/layout.tsx pour le site public.
export const metadata: Metadata = {
  title: { default: `${SITE_NAME} Admin`, template: `%s | ${SITE_NAME} Admin` },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
