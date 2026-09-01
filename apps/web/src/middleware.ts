import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // /admin et /api ne sont jamais localisés (voir app/(admin) et lib/auth/current-admin.ts) ;
  // le reste (site public) passe par la négociation de langue de next-intl.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
