export interface NavItem {
  label: string;
  href: string;
  icon: "home" | "matches" | "standings" | "mercato" | "video" | "news" | "more";
}

/** Source unique des entrées de navigation — pilote à la fois BottomNav (mobile) et Sidebar (desktop). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/", icon: "home" },
  { label: "Matchs", href: "/matches", icon: "matches" },
  { label: "Classements", href: "/classements", icon: "standings" },
  { label: "Mercato", href: "/mercato", icon: "mercato" },
  { label: "Vidéo", href: "/video", icon: "video" },
  { label: "Actus", href: "/news", icon: "news" },
];
