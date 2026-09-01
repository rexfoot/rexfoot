"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/cn";

/** Nav desktop — la nav mobile (BottomNav) prend le relais sous `md`. */
export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-rf-border bg-rf-bg/95 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2 font-display text-xl font-extrabold tracking-tight">
          <span className="text-rf-gold">Rex</span>
          <span className="text-rf-fg">Foot</span>
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex items-center gap-6 text-sm font-medium">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative py-1 transition-colors hover:text-rf-fg",
                      isActive ? "text-rf-fg" : "text-rf-fg-muted",
                      "after:absolute after:-bottom-[17px] after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-rf-gold after:transition-opacity",
                      isActive ? "after:opacity-100" : "after:opacity-0",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
