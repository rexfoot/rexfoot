"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** Relance manuellement la vérification du statut de transcodage d'une vidéo restée en traitement. */
export function SyncButton({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    await fetch(`/api/admin/videos/${videoId}/sync`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={loading}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-rf-border px-3 py-2 text-sm font-medium text-rf-fg transition-colors hover:border-rf-gold/40 disabled:opacity-50"
    >
      <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
      Actualiser
    </button>
  );
}
