import type { NavItem } from "@/lib/nav";

/** Couleur d'identité par section de nav — voir le commentaire sur les tokens `--rf-*` dans globals.css. */
export const NAV_ACCENT: Record<NavItem["icon"], { text: string; bg: string }> = {
  home: { text: "text-rf-gold", bg: "bg-rf-gold/15" },
  matches: { text: "text-rf-matches", bg: "bg-rf-matches/15" },
  standings: { text: "text-rf-standings", bg: "bg-rf-standings/15" },
  portraits: { text: "text-rf-mercato", bg: "bg-rf-mercato/15" },
  video: { text: "text-rf-video", bg: "bg-rf-video/15" },
  news: { text: "text-rf-news", bg: "bg-rf-news/15" },
  talents: { text: "text-rf-orange", bg: "bg-rf-orange/15" },
  wire: { text: "text-rf-news", bg: "bg-rf-news/15" },
  more: { text: "text-rf-gold", bg: "bg-rf-gold/15" },
};
