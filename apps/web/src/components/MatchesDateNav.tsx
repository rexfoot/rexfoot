"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

function formatLabel(iso: string): string {
  const today = toISODate(new Date());
  if (iso === today) return "Aujourd'hui";
  if (iso === addDays(today, 1)) return "Demain";
  if (iso === addDays(today, -1)) return "Hier";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

interface MatchesDateNavProps {
  selectedDate?: string;
}

/** Navigation par date (veille/lendemain + sélecteur natif) pour le calendrier des matchs. */
export function MatchesDateNav({ selectedDate }: MatchesDateNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = selectedDate ?? toISODate(new Date());

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
        aria-label="Jour précédent"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rf-fg-muted transition-colors hover:bg-rf-bg-elevated hover:text-rf-fg"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex-1 text-center font-display text-sm font-bold text-rf-fg">{formatLabel(current)}</div>

      <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-rf-fg-muted transition-colors hover:bg-rf-bg-elevated hover:text-rf-fg">
        <CalendarDays size={18} />
        <input
          type="date"
          value={current}
          onChange={(event) => event.target.value && goTo(event.target.value)}
          aria-label="Choisir une date"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      <button
        type="button"
        onClick={() => goTo(addDays(current, 1))}
        aria-label="Jour suivant"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rf-fg-muted transition-colors hover:bg-rf-bg-elevated hover:text-rf-fg"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
