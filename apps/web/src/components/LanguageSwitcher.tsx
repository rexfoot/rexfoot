"use client";

import type { ChangeEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";

interface LanguageSwitcherProps {
  className?: string;
}

/** Change de langue en conservant la page courante — utilisé dans Sidebar et MobileHeader. */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("language");

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    router.replace(pathname, { locale: event.target.value });
  }

  return (
    <label
      className={cn(
        "relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-rf-bg-card text-xs font-bold text-rf-fg-muted transition-colors hover:text-rf-fg",
        className,
      )}
      title={t("switchLabel")}
    >
      <span aria-hidden="true">{locale.toUpperCase()}</span>
      <span className="sr-only">{t("switchLabel")}</span>
      <select
        value={locale}
        onChange={handleChange}
        aria-label={t("switchLabel")}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {routing.locales.map((value) => (
          <option key={value} value={value}>
            {t(value)}
          </option>
        ))}
      </select>
    </label>
  );
}
