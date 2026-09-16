"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

interface Source {
  id: string;
  publisherName: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
}

interface AggregatorModerationCardProps {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "REJECTED";
  firstSeenAt: string;
  sources: Source[];
}

/** Une carte "sujet détecté" avec ses médias sources — action rapide publier/rejeter (voir /api/admin/aggregator/[id]). */
export function AggregatorModerationCard({ id, title, status, firstSeenAt, sources }: AggregatorModerationCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const setStatus = async (next: "PUBLISHED" | "REJECTED" | "DRAFT") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/aggregator/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-rf-border bg-rf-bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold",
              status === "PUBLISHED" && "bg-rf-success/15 text-rf-success",
              status === "DRAFT" && "bg-rf-fg-subtle/15 text-rf-fg-muted",
              status === "REJECTED" && "bg-rf-live/15 text-rf-live",
            )}
          >
            {status === "PUBLISHED" ? "Publié" : status === "REJECTED" ? "Rejeté" : "En attente"}
          </span>
          <span className="rounded-full bg-rf-gold/10 px-2 py-0.5 text-xs font-semibold text-rf-gold">
            {sources.length} média{sources.length > 1 ? "s" : ""}
          </span>
          <span className="text-xs text-rf-fg-subtle">{new Date(firstSeenAt).toLocaleString("fr-FR")}</span>
        </div>
        <div className="flex shrink-0 gap-2">
          {status !== "PUBLISHED" && (
            <button
              onClick={() => setStatus("PUBLISHED")}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rf-success/15 px-3 py-1.5 text-xs font-semibold text-rf-success transition hover:bg-rf-success/25 disabled:opacity-50"
            >
              <Check size={13} /> Publier
            </button>
          )}
          {status !== "REJECTED" && (
            <button
              onClick={() => setStatus("REJECTED")}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rf-live/15 px-3 py-1.5 text-xs font-semibold text-rf-live transition hover:bg-rf-live/25 disabled:opacity-50"
            >
              <X size={13} /> Rejeter
            </button>
          )}
          {status !== "DRAFT" && (
            <button
              onClick={() => setStatus("DRAFT")}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rf-border px-3 py-1.5 text-xs font-medium text-rf-fg-muted transition hover:border-rf-gold/40"
            >
              <RotateCcw size={13} /> Revenir en attente
            </button>
          )}
        </div>
      </div>

      <p className="font-medium text-rf-fg">{title}</p>

      <ul className="space-y-1.5">
        {sources.map((source) => (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-rf-fg hover:text-rf-gold hover:underline"
            >
              <ExternalLink size={13} className="shrink-0" />
              <span className="text-rf-fg-subtle">[{source.publisherName}]</span>
              <span className="truncate">{source.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
