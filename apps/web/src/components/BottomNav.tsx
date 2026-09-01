"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, ListOrdered, PlayCircle, Newspaper } from "lucide-react";
import { NAV_ITEMS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/cn";

const ICONS: Record<NavItem["icon"], typeof Home> = {
  home: Home,
  matches: CalendarDays,
  standings: ListOrdered,
  video: PlayCircle,
  news: Newspaper,
  more: Home,
};

/** Nav mobile fixe en bas de l'écran — priorité #1 de l'UX RexFoot. Cachée dès `md`. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rf-border bg-rf-bg-elevated/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-rf-gold" : "text-rf-fg-muted",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
