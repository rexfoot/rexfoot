import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Le français (locale par défaut, `localePrefix: "as-needed"`) n'a pas de
  // préfixe : `/` est l'URL canonique. next-intl sert aussi `/fr/...` en 200
  // (contenu dupliqué pour Google) — 301 permanent vers l'URL sans préfixe.
  // Une seule URL FR, hreflang/sitemap pointent déjà vers `/`. Les URLs
  // `/fr/...` n'étant ni canoniques ni maillées, ce redirect ne coûte rien
  // aux perfs des URLs normales (aucun redirect sur `/`, `/en`, ...).
  // Note : `/fr/opengraph-image` (og:image des meta FR) suit le même 301 —
  // les scrapers réseaux sociaux (Facebook/X/WhatsApp) suivent ce redirect
  // unique vers une 200, aucun traitement spécial nécessaire.
  if (pathname === "/fr" || pathname.startsWith("/fr/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/fr(?=\/|$)/, "") || "/";
    return NextResponse.redirect(url, 301);
  }
  return handleI18nRouting(request);
}

export const config = {
  // /admin et /api ne sont jamais localisés (voir app/(admin) et lib/auth/current-admin.ts) ;
  // le reste (site public) passe par la négociation de langue de next-intl.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
