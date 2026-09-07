"use client";

import { useState } from "react";
import { AdminButton, Banner } from "@/components/admin/ui";
import { cn } from "@/lib/cn";

export function LiveAudioToggle({ initialIsLive }: { initialIsLive: boolean }) {
  const [isLive, setIsLive] = useState(initialIsLive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    const next = !isLive;

    const response = await fetch("/api/admin/live-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLive: next }),
    });

    if (!response.ok) {
      setError("Une erreur est survenue, réessaie.");
      setSaving(false);
      return;
    }

    setIsLive(next);
    setSaving(false);
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-rf-border bg-rf-bg-elevated px-4 py-3.5">
        <div>
          <p className="font-semibold text-rf-fg">Statut du direct</p>
          <p className="text-sm text-rf-fg-subtle">
            {isLive ? "🔴 En direct — le lecteur est visible sur les pages match" : "Hors ligne — le lecteur est masqué"}
          </p>
        </div>
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", isLive ? "bg-rf-live" : "bg-rf-fg-subtle/40")} aria-hidden />
      </div>

      {error && <Banner kind="error">{error}</Banner>}

      <AdminButton
        type="button"
        variant={isLive ? "danger" : "primary"}
        onClick={toggle}
        disabled={saving}
        className="w-full sm:w-auto"
      >
        {saving ? "…" : isLive ? "Arrêter le direct" : "Démarrer le direct"}
      </AdminButton>
    </div>
  );
}
