"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ACCENT } from "@/lib/nav-colors";
import { NAV_ICONS } from "@/components/nav-icons";
import { AccountMenuButton } from "@/components/AccountMenuButton";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SearchOverlay } from "@/components/SearchOverlay";
import type { CurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/cn";

/** Rail d'icônes fixe — nav principale desktop, remplace le header texte dès `md`. */
export function Sidebar({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-20 shrink-0 flex-col items-center border-e border-rf-border bg-rf-bg-elevated py-5 md:flex">
      <Link
        href="/"
          className="relative mb-8 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full"
          style={{ background: "linear-gradient(135deg, var(--rf-gold) 50%, var(--rf-orange) 50%)" }}
                  aria-label="RexFoot — Accueil"
        >
          <Image src="/logo-crown.png" alt="RexFoot" fill sizes="40px" className="object-cover" />
      </Link>

      <SearchOverlay className="mb-4" />

      <nav className="flex flex-1 flex-col items-center gap-2" aria-label="Navigation principale">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const label = t(item.icon);
          const accent = NAV_ACCENT[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              title={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                isActive ? `${accent.bg} ${accent.text}` : "text-rf-fg-muted hover:bg-rf-bg-card hover:text-rf-fg",
              )}
            >
              <Icon size={21} strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>

      <LanguageSwitcher className="mb-3" />
      {user && <NotificationBell variant="rail" />}
      <AccountMenuButton user={user} />
    </aside>
  );
}
