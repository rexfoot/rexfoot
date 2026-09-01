"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { toIntlLocale } from "@/lib/intl-locale";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

interface MatchesDateNavProps {
  selectedDate?: string;
}

/** Navigation par date (veille/lendemain + sélecteur natif) pour le calendrier des matchs. */
export function MatchesDateNav({ selectedDate }: MatchesDateNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("matches");
  const locale = useLocale();
  const current = selectedDate ?? toISODate(new Date());

  function formatLabel(iso: string): string {
    const today = toISODate(new Date());
    if (iso === today) return t("today");
    if (iso === addDays(today, 1)) return t("tomorrow");
    if (iso === addDays(today, -1)) return t("yesterday");
    return new Date(`${iso}T12:00:00`).toLocaleDateString(toIntlLocale(locale), {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function goTo(iso: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", iso);
    params.delete("page");
    router.push(`/matches?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-rf-border bg-rf-bg-card p-2">
      <button
        type="button"
        onClick={() => goTo(addDays(current, -1))}
        aria-label={t("previousDay")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rf-fg-muted transition-colors hover:bg-rf-bg-elevated hover:text-rf-fg"
      >
        <ChevronLeft size={18} className="rtl:rotate-180" />
      </button>

      <div className="flex-1 text-center font-display text-sm font-bold text-rf-fg">{formatLabel(current)}</div>

      <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-rf-fg-muted transition-colors hover:bg-rf-bg-elevated hover:text-rf-fg">
        <CalendarDays size={18} />
        <input
          type="date"
          value={current}
          onChange={(event) => event.target.value && goTo(event.target.value)}
          aria-label={t("chooseDate")}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      <button
        type="button"
        onClick={() => goTo(addDays(current, 1))}
        aria-label={t("nextDay")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rf-fg-muted transition-colors hover:bg-rf-bg-elevated hover:text-rf-fg"
      >
        <ChevronRight size={18} className="rtl:rotate-180" />
      </button>
    </div>
  );
}
