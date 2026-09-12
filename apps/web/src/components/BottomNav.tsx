"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ACCENT } from "@/lib/nav-colors";
import { NAV_ICONS } from "@/components/nav-icons";
import { cn } from "@/lib/cn";

/** Nav mobile fixe en bas de l'écran — priorité #1 de l'UX RexFoot. Cachée dès `md`. */
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const items = NAV_ITEMS.filter((item) => !item.hideInBottomNav);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rf-border bg-rf-bg-elevated/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      {/* gap-1 : sans ça, 6 items en flex-1 se touchent bord à bord sur les
          petits écrans (constaté par Hicham entre "Classements" et
          "Portraits", les deux libellés les plus longs). */}
      <ul className="flex items-stretch justify-around gap-1">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const accent = NAV_ACCENT[item.icon];
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? accent.text : "text-rf-fg-muted",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="truncate">{t(item.icon)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
