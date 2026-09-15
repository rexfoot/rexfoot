"use client";

import { useState } from "react";
import { Film, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface GenerateVideoButtonProps {
  articleId: string;
  articleStatus: string;
}

export function GenerateVideoButton({ articleId, articleStatus }: GenerateVideoButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/news/${articleId}/generate-video`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Une erreur est survenue.");
        return;
      }

      setStatus("success");
      setMessage(data.message || "Génération lancée !");
    } catch {
      setStatus("error");
      setMessage("Erreur de connexion.");
    }
  };

  if (articleStatus !== "PUBLISHED") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-rf-border bg-rf-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-rf-accent" />
          <span className="text-sm font-semibold text-rf-fg">Générer une vidéo</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={status === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-rf-accent px-4 py-2 text-sm font-semibold text-rf-bg transition hover:bg-rf-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Film size={14} />
              Générer
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          className={`mt-3 flex items-center gap-2 text-sm ${
            status === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {status === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {message}
        </div>
      )}
    </div>
  );
}
