"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/cn";

interface AccountMenuButtonProps {
  user: CurrentUser | null;
}

/** Icône de compte partagée entre Sidebar (desktop) et MobileHeader — connecté = initiale, sinon icône générique. */
export function AccountMenuButton({ user }: AccountMenuButtonProps) {
  const pathname = usePathname();
  const isActive = pathname === "/account" || pathname === "/login" || pathname === "/signup";
  const href = user ? "/account" : `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <Link
      href={href}
      title={user ? user.displayName : "Se connecter"}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
        isActive ? "bg-rf-gold/15 text-rf-gold" : "bg-rf-bg-card text-rf-fg-muted hover:text-rf-fg",
      )}
    >
      {user ? user.displayName.charAt(0).toUpperCase() : <User size={19} />}
      <span className="sr-only">{user ? "Mon compte" : "Se connecter"}</span>
    </Link>
  );
}
