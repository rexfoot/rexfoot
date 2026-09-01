"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LogOut } from "lucide-react";

export function PublicLogoutButton() {
  const t = useTranslations("account");
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-rf-border px-3 py-2 text-sm font-medium text-rf-fg-muted transition-colors hover:text-rf-fg"
    >
      <LogOut size={16} />
      {t("logout")}
    </button>
  );
}
