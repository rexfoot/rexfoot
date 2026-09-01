import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "media-src 'self' https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      // upload.videodelivery.net : upload direct navigateur → Cloudflare Stream depuis le panel admin.
      "connect-src 'self' https://upload.videodelivery.net https://*.cloudflarestream.com",
      // iframe.videodelivery.net : lecteur vidéo intégré Cloudflare Stream sur /video/[slug].
      "frame-src https://iframe.videodelivery.net https://*.cloudflarestream.com",
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

export default nextConfig;
