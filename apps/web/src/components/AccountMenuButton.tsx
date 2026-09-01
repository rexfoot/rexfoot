"use client";

import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { CurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/cn";

interface AccountMenuButtonProps {
  user: CurrentUser | null;
}

/** Icône de compte partagée entre Sidebar (desktop) et MobileHeader — connecté = initiale, sinon icône générique. */
export function AccountMenuButton({ user }: AccountMenuButtonProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const isActive = pathname === "/account" || pathname === "/login" || pathname === "/signup";

  return (
    <Link
      href={user ? "/account" : { pathname: "/login", query: { next: pathname } }}
      title={user ? user.displayName : t("login")}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
        isActive ? "bg-rf-gold/15 text-rf-gold" : "bg-rf-bg-card text-rf-fg-muted hover:text-rf-fg",
      )}
    >
      {user ? user.displayName.charAt(0).toUpperCase() : <User size={19} />}
      <span className="sr-only">{user ? t("account") : t("login")}</span>
    </Link>
  );
}
