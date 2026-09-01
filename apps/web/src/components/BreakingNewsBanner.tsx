"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const DISMISSED_KEY = "rf_dismissed_breaking";

interface BreakingItem {
  id: string;
  slug: string;
  title: string;
  breakingPriority: "HIGH" | "URGENT";
}

/**
 * Bandeau site-wide (section 12 du plan) — rendu côté serveur dès qu'une
 * alerte est active, donc visible immédiatement. Le rejet (croix) se
 * mémorise en localStorage ; on part d'un état "rien de rejeté" pour que le
 * rendu client initial corresponde au HTML serveur (pas de warning
 * d'hydratation), quitte à faire réapparaître brièvement le bandeau chez un
 * visiteur qui l'avait déjà fermé avant de le re-masquer après le montage.
 */
export function BreakingNewsBanner({ items }: { items: BreakingItem[] }) {
  const t = useTranslations("breakingNews");
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    // setTimeout plutôt qu'un appel synchrone : évite un rendu en cascade
    // directement dans le corps de l'effet (règle react-hooks/set-state-in-effect).
    const id = setTimeout(() => {
      try {
        const stored = localStorage.getItem(DISMISSED_KEY);
        if (stored) setDismissedIds(JSON.parse(stored));
      } catch {
        // localStorage indisponible (navigation privée, etc.) — le bandeau reste juste non-masquable.
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const visible = items.filter((item) => !dismissedIds.includes(item.id));
  if (visible.length === 0) return null;

  const top = visible[0];

  function dismiss() {
    const next = [...dismissedIds, top.id];
    setDismissedIds(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Rien à faire si le stockage échoue — le rejet reste effectif pour cette session React.
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-white",
        top.breakingPriority === "URGENT" ? "bg-rf-live" : "bg-rf-crimson",
      )}
    >
      <AlertTriangle size={16} className="shrink-0 animate-pulse" />
      <span className="shrink-0 rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
        {t("label")}
      </span>
      <Link href={`/news/${top.slug}`} className="min-w-0 flex-1 truncate hover:underline">
        {top.title}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="shrink-0 rounded p-1 transition-colors hover:bg-black/15"
      >
        <X size={16} />
      </button>
    </div>
  );
}
