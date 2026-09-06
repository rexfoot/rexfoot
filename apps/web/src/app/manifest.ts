import type { MetadataRoute } from "next";
import { SITE_NAME } from "@rexfoot/config";

/**
 * Manifeste PWA global (une seule fiche, pas par locale — c'est ce
 * qu'attendent Bubblewrap/le Play Store pour la TWA). Le français (locale
 * par défaut, sans préfixe) sert de start_url : voir routing.ts.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Actu foot, scores et compositions en direct",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
