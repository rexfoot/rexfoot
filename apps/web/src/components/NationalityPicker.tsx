"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { EmptyState } from "./EmptyState";
import { NationalityFlag } from "./NationalityFlag";
import type { NationalityDateOption } from "./NationalityDateFilter";
import type { NationalityOption } from "@/lib/types";

function hrefFor(nationality: string, date: NationalityDateOption): string {
  const params = new URLSearchParams({ nationality });
  if (date !== "today") params.set("date", date);
  return `/nationalite?${params.toString()}`;
}

export function NationalityPicker({
  options,
  selected,
  date,
}: {
  options: NationalityOption[];
  selected?: string;
  date: NationalityDateOption;
}) {
  const t = useTranslations("nationality");
  const router = useRouter();
  const [expanded, setExpanded] = useState(!selected);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  function selectNationality(name: string) {
    setExpanded(false);
    setQuery("");
    router.push(hrefFor(name, date));
  }

  const selectedOption = selected ? options.find((o) => o.name === selected) : undefined;

  return (
    <div className="space-y-3">
      {selected && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-rf-border bg-rf-bg-card px-4 py-3"
        >
          <span className="flex items-center gap-2.5 font-display text-lg font-bold text-rf-fg">
            <NationalityFlag url={selectedOption?.flagUrl ?? null} name={selected} size={28} />
            {selected}
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-rf-gold">
            {t("change")}
            <ChevronDown size={16} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
          </span>
        </button>
      )}

      {expanded && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-full border border-rf-border bg-rf-bg-card px-4 py-2.5">
            <Search size={16} className="shrink-0 text-rf-fg-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              autoFocus={!selected}
              className="min-w-0 flex-1 bg-transparent text-sm text-rf-fg placeholder:text-rf-fg-subtle focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title={t("noResults", { query })} />
          ) : (
            <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {filtered.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => selectNationality(option.name)}
                  className="flex items-center gap-2 rounded-xl border border-rf-border bg-rf-bg-card px-3 py-2.5 text-start text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40"
                >
                  <NationalityFlag url={option.flagUrl} name={option.name} size={22} />
                  <span className="truncate">{option.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
