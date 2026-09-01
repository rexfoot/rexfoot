export interface NavItem {
  href: string;
  icon: "home" | "matches" | "standings" | "mercato" | "video" | "news" | "more";
}

/**
 * Source unique des entrées de navigation — pilote à la fois BottomNav (mobile)
 * et Sidebar (desktop). Pas de `label` en dur : chaque `icon` correspond
 * exactement à une clé du namespace "nav" des messages (messages/*.json).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "home" },
  { href: "/matches", icon: "matches" },
  { href: "/classements", icon: "standings" },
  { href: "/mercato", icon: "mercato" },
  { href: "/video", icon: "video" },
  { href: "/news", icon: "news" },
];
