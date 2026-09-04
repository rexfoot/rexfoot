import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rexfoot.com";

export default function robots(): MetadataRoute.Robots {
  // /account est localisé (/account, /en/account, /es/account) : un simple
  // "/account" en dur ne bloquerait que la version française.
  const accountPaths = routing.locales.map((locale) => getPathname({ href: "/account", locale }));

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", ...accountPaths] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
