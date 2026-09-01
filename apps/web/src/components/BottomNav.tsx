"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/nav-icons";
import { cn } from "@/lib/cn";

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
          const Icon = NAV_ICONS[item.icon];
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-rf-gold" : "text-rf-fg-muted",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
