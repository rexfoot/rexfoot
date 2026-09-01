"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Newspaper, ArrowLeftRight, Film, Users, UserCog } from "lucide-react";
import type { UserRole } from "@rexfoot/db";
import { can } from "@/lib/auth/permissions";
import { LogoutButton } from "./LogoutButton";
import { cn } from "@/lib/cn";

interface NavEntry {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Omis = visible pour tous les rôles admin. */
  requires?: "viewNews" | "viewTransfers" | "viewVideos" | "manageUsers";
}

const NAV_ITEMS: NavEntry[] = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Actualités", href: "/admin/news", icon: Newspaper, requires: "viewNews" },
  { label: "Mercato", href: "/admin/transfers", icon: ArrowLeftRight, requires: "viewTransfers" },
  { label: "Vidéos", href: "/admin/videos", icon: Film, requires: "viewVideos" },
  { label: "Utilisateurs", href: "/admin/users", icon: Users, requires: "manageUsers" },
  { label: "Mon compte", href: "/admin/account", icon: UserCog },
];

interface AdminShellProps {
  adminName: string;
  role: UserRole;
  children: ReactNode;
}

export function AdminShell({ adminName, role, children }: AdminShellProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.requires || can(role, item.requires));

  return (
    <div className="min-h-screen bg-rf-bg">
      <header className="sticky top-0 z-40 border-b border-rf-border bg-rf-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-baseline gap-2 font-display text-lg font-extrabold tracking-tight">
            <span className="text-rf-gold">Rex</span>
            <span className="text-rf-fg">Foot</span>
            <span className="ml-1 text-xs font-medium text-rf-fg-subtle">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-rf-fg-muted sm:inline">{adminName}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6" aria-label="Navigation admin">
          {visibleItems.map((item) => {
            const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-rf-gold/15 text-rf-gold" : "text-rf-fg-muted hover:text-rf-fg",
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
