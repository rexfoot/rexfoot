import { Home, CalendarDays, ListOrdered, PlayCircle, Newspaper } from "lucide-react";
import type { NavItem } from "@/lib/nav";

/** Icônes partagées entre Sidebar (desktop) et BottomNav (mobile) — source unique pour rester cohérent. */
export const NAV_ICONS: Record<NavItem["icon"], typeof Home> = {
  home: Home,
  matches: CalendarDays,
  standings: ListOrdered,
  video: PlayCircle,
  news: Newspaper,
  more: Home,
};
