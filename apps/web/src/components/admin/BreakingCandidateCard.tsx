"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface BreakingCandidateCardProps {
  id: string;
  title: string;
  breakingPriority: "HIGH" | "URGENT";
  sourcesCount: number;
}

/**
 * Un clic pour approuver (publie + démarre le chrono de la barre urgente) ou
 * rejeter (redevient un brouillon normal) — voir /api/admin/news/[id]/breaking-decision.
 * La rapidité d'approbation est le point du Chantier B : jamais besoin
 * d'ouvrir le formulaire complet pour cette décision binaire.
 */
export function BreakingCandidateCard({ id, title, breakingPriority, sourcesCount }: BreakingCandidateCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const decide = async (action: "approve" | "reject") => {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/news/${id}/breaking-decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:items-center",
        breakingPriority === "URGENT" ? "border-rf-live bg-rf-live/5" : "border-rf-crimson bg-rf-crimson/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white",
              breakingPriority === "URGENT" ? "bg-rf-live" : "bg-rf-crimson",
            )}
          >
            <AlertTriangle size={11} />
            {breakingPriority === "URGENT" ? "URGENT" : "IMPORTANT"}
          </span>
          <span className="text-xs text-rf-fg-subtle">
            {sourcesCount} source{sourcesCount > 1 ? "s" : ""} indépendante{sourcesCount > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-1.5 font-medium text-rf-fg">{title}</p>
        <Link href={`/admin/news/${id}/edit`} className="text-xs text-rf-fg-subtle underline hover:text-rf-gold">
          Voir l&apos;article complet avant de décider
        </Link>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => decide("approve")}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rf-success px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rf-success/90 disabled:opacity-50"
        >
          <Check size={15} /> Publier
        </button>
        <button
          onClick={() => decide("reject")}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rf-border px-4 py-2.5 text-sm font-semibold text-rf-fg-muted transition hover:border-rf-live/40 hover:text-rf-live disabled:opacity-50"
        >
          <X size={15} /> Rejeter
        </button>
      </div>
    </div>
  );
}
