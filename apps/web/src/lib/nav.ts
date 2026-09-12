export interface NavItem {
  href: string;
  icon: "home" | "matches" | "standings" | "portraits" | "video" | "news" | "talents" | "more";
}

/**
 * Source unique des entrées de navigation — pilote à la fois BottomNav (mobile)
 * et Sidebar (desktop). Pas de `label` en dur : chaque `icon` correspond
 * exactement à une clé du namespace "nav" des messages (messages/*.json).
 *
 * "mercato" retiré du menu le 2026-09-12 (Hicham : zéro trafic sur /mercato,
 * remplacé par "portraits") — la page /mercato et ses données existent
 * toujours, juste plus promue ici. Les rumeurs de transfert restent
 * publiables comme un article normal (catégorie TRANSFERTS).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "home" },
  { href: "/matches", icon: "matches" },
  { href: "/classements", icon: "standings" },
  { href: "/portraits", icon: "portraits" },
  { href: "/video", icon: "video" },
  { href: "/news", icon: "news" },
  { href: "/talents", icon: "talents" },
];
