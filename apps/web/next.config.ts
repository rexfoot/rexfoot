import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // blob: est nécessaire à l'aperçu d'image côté client dans les formulaires
      // admin (URL.createObjectURL sur le fichier sélectionné, avant upload).
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "style-src 'self' 'unsafe-inline'",
      // googletagmanager.com : script gtag.js (Google Analytics, apps/web/src/components/GoogleAnalytics.tsx).
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      // google-analytics.com / analytics.google.com : appels de mesure envoyés par gtag.js (sous-domaines
      // régionaux, ex. region1.google-analytics.com — d'où le wildcard plutôt qu'un host fixe).
      "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com",
      // youtube.com/youtube-nocookie.com : vidéos synchronisées depuis la chaîne
      // YouTube du propriétaire (apps/worker/src/jobs/syncYoutubeVideos.ts),
      // même page /video/[slug], playbackUrl pointant vers youtube.com/embed/.
      // (Cloudflare Stream retiré de la CSP le 2026-10-05 : service résilié, plus aucun embed/upload.)
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Évite que `next dev`/`next build` régénèrent AGENTS.md/CLAUDE.md à chaque run.
  agentRules: false,
  // Le client Prisma fait de l'accès filesystem dynamique (résolution des
  // binaires moteur) qui casse le tracing statique de Next — on le charge
  // en dépendance native côté serveur plutôt que de le bundler.
  serverExternalPackages: ["@prisma/client", "@rexfoot/db"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
