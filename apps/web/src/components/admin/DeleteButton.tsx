"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteButtonProps {
  endpoint: string;
  redirectTo: string;
  confirmMessage: string;
}

export function DeleteButton({ endpoint, redirectTo, confirmMessage }: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    setLoading(true);

    const response = await fetch(endpoint, { method: "DELETE" });
    if (response.ok) {
      router.push(redirectTo);
      router.refresh();
      return;
    }
    setLoading(false);
    window.alert("La suppression a échoué. Réessaie dans un instant.");
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-rf-live/30 px-3 py-2 text-sm font-medium text-rf-live transition-colors hover:bg-rf-live/10 disabled:opacity-50"
    >
      <Trash2 size={14} />
      Supprimer
    </button>
  );
}
