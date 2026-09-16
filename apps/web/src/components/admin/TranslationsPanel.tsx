"use client";

import { useState } from "react";
import { Languages, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface Translation {
  locale: "EN" | "ES";
  title: string;
  status: string;
}

interface TranslationsPanelProps {
  articleId: string;
  translations: Translation[];
}

const LOCALE_LABEL: Record<Translation["locale"], string> = { EN: "Anglais", ES: "Espagnol" };

/**
 * Traductions générées par l'agent éditorial (voir translateArticle.ts) —
 * jamais publiées automatiquement, même geste de revue humaine minimal que
 * pour l'article FR : un clic par langue une fois relue.
 */
export function TranslationsPanel({ articleId, translations }: TranslationsPanelProps) {
  const [publishing, setPublishing] = useState<string | null>(null);
  const [published, setPublished] = useState<Set<string>>(
    new Set(translations.filter((t) => t.status === "PUBLISHED").map((t) => t.locale)),
  );
  const [error, setError] = useState<string | null>(null);

  if (translations.length === 0) return null;

  const handlePublish = async (locale: string) => {
    setPublishing(locale);
    setError(null);
    try {
      const res = await fetch(`/api/admin/news/${articleId}/translations/${locale}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Une erreur est survenue.");
        return;
      }
      setPublished((prev) => new Set(prev).add(locale));
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className="rounded-2xl border border-rf-border bg-rf-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Languages size={18} className="text-rf-accent" />
        <span className="text-sm font-semibold text-rf-fg">Traductions (agent éditorial)</span>
      </div>
      <ul className="space-y-2">
        {translations.map((t) => {
          const isPublished = published.has(t.locale);
          return (
            <li key={t.locale} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="mr-2 text-xs font-semibold tracking-wide text-rf-fg-subtle uppercase">
                  {LOCALE_LABEL[t.locale]}
                </span>
                <span className="truncate text-sm text-rf-fg">{t.title}</span>
              </div>
              {isPublished ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-500">
                  <CheckCircle size={13} /> Publiée
                </span>
              ) : (
                <button
                  onClick={() => handlePublish(t.locale)}
                  disabled={publishing === t.locale}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rf-accent px-3 py-1.5 text-xs font-semibold text-rf-bg transition hover:bg-rf-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publishing === t.locale ? <Loader2 size={12} className="animate-spin" /> : null}
                  Publier
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
