export interface NavItem {
  label: string;
  href: string;
  icon: "home" | "matches" | "standings" | "video" | "news" | "more";
}

/** Source unique des entrées de navigation — pilote à la fois BottomNav (mobile) et TopNav (desktop). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/", icon: "home" },
  { label: "Matchs", href: "/matches", icon: "matches" },
  { label: "Classements", href: "/classements", icon: "standings" },
  { label: "Vidéo", href: "/video", icon: "video" },
  { label: "Actus", href: "/news", icon: "news" },
];
