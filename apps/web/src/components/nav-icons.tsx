import { Home, CalendarDays, ListOrdered, ArrowLeftRight, PlayCircle, Newspaper } from "lucide-react";
import type { NavItem } from "@/lib/nav";

/** Icônes partagées entre Sidebar (desktop) et BottomNav (mobile) — source unique pour rester cohérent. */
export const NAV_ICONS: Record<NavItem["icon"], typeof Home> = {
  home: Home,
  matches: CalendarDays,
  standings: ListOrdered,
  mercato: ArrowLeftRight,
  video: PlayCircle,
  news: Newspaper,
  more: Home,
};
