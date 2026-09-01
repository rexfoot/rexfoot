"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/nav-icons";
import { cn } from "@/lib/cn";

/** Rail d'icônes fixe — nav principale desktop, remplace le header texte dès `md`. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-20 shrink-0 flex-col items-center border-r border-rf-border bg-rf-bg-elevated py-5 md:flex">
      <Link
        href="/"
        className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-rf-gold font-display text-lg font-extrabold text-rf-bg"
        aria-label="RexFoot — Accueil"
      >
        R
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2" aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                isActive ? "bg-rf-gold/15 text-rf-gold" : "text-rf-fg-muted hover:bg-rf-bg-card hover:text-rf-fg",
              )}
            >
              <Icon size={21} strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
