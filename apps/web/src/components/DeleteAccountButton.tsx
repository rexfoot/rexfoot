"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Trash2 } from "lucide-react";

/** Bouton de suppression de compte avec confirmation en deux temps (jamais de suppression sur un simple clic). */
export function DeleteAccountButton() {
  const t = useTranslations("deleteAccount");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError(false);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setError(true);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm font-medium text-rf-fg">{t("confirmPrompt")}</p>
        {error && <p className="text-sm text-red-400">{t("errorMessage")}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-60"
          >
            {deleting ? t("deletingButton") : t("confirmFinalButton")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="rounded-lg border border-rf-border px-3 py-2 text-sm font-medium text-rf-fg-muted transition-colors hover:text-rf-fg"
          >
            {t("cancelButton")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 rounded-lg border border-rf-border px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500/50 hover:text-red-300"
    >
      <Trash2 size={16} />
      {t("confirmButton")}
    </button>
  );
}
