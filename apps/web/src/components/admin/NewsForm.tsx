"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { NewsCategory, BreakingPriority } from "@rexfoot/db";
import { AdminInput, AdminTextarea, AdminSelect, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";
import { NEWS_CATEGORY_VALUES, NEWS_CATEGORY_LABELS } from "@/lib/news-categories";

type SaveStatus = "DRAFT" | "PUBLISHED";

interface NewsFormInitial {
  title: string;
  category: NewsCategory;
  summary: string;
  content: string;
  coverImageUrl: string | null;
  isBreaking: boolean;
  breakingPriority: BreakingPriority;
}

interface NewsFormProps {
  mode: "create" | "edit";
  articleId?: string;
  initial?: NewsFormInitial;
}

/** Formulaire partagé entre "Nouvel article" et "Modifier" — deux boutons d'enregistrement (brouillon/publié). */
export function NewsForm({ mode, articleId, initial }: NewsFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<SaveStatus | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.coverImageUrl ?? null);
  const [isBreaking, setIsBreaking] = useState(initial?.isBreaking ?? false);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerateSummary() {
    const title = titleRef.current?.value.trim();
    const content = contentRef.current?.value.trim();
    if (!title || !content) {
      setAiError("Remplis le titre et le contenu avant de générer un résumé.");
      return;
    }

    setAiPending(true);
    setAiError(null);

    const response = await fetch("/api/admin/news/ai-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setAiError(body?.error ?? "Échec de la génération, réessaie.");
      setAiPending(false);
      return;
    }

    const { summary } = (await response.json()) as { summary: string };
    if (summaryRef.current) summaryRef.current.value = summary;
    setAiPending(false);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function handleSave(status: SaveStatus) {
    if (!formRef.current) return;
    setError(null);
    setPending(status);

    const formData = new FormData(formRef.current);
    formData.set("status", status);

    const endpoint = mode === "create" ? "/api/admin/news" : `/api/admin/news/${articleId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, { method, body: formData });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Une erreur est survenue, réessaie.");
      setPending(null);
      return;
    }

    router.push("/admin/news?saved=1");
    router.refresh();
  }

  return (
    <form ref={formRef} className="max-w-2xl space-y-5">
      <FieldGroup label="Titre" htmlFor="title">
        <AdminInput
          id="title"
          name="title"
          ref={titleRef}
          defaultValue={initial?.title}
          required
          placeholder="Ex. Le PSG s'impose 3-1 face à Marseille"
        />
      </FieldGroup>

      <FieldGroup label="Catégorie" htmlFor="category">
        <AdminSelect id="category" name="category" defaultValue={initial?.category ?? "AUTRE"}>
          {NEWS_CATEGORY_VALUES.map((value) => (
            <option key={value} value={value}>
              {NEWS_CATEGORY_LABELS[value]}
            </option>
          ))}
        </AdminSelect>
      </FieldGroup>

      <FieldGroup
        label="Résumé (optionnel)"
        htmlFor="summary"
        hint="Une ou deux phrases, affichées sous le titre dans les listes."
      >
        <AdminTextarea
          id="summary"
          name="summary"
          ref={summaryRef}
          defaultValue={initial?.summary}
          rows={2}
          placeholder="Résumé court"
        />
        <button
          type="button"
          onClick={handleGenerateSummary}
          disabled={aiPending}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-rf-gold transition-colors hover:text-rf-gold-soft disabled:opacity-50"
        >
          <Sparkles size={15} />
          {aiPending ? "Génération…" : "Générer avec l'IA"}
        </button>
        {aiError && <p className="mt-1 text-xs text-rf-live">{aiError}</p>}
      </FieldGroup>

      <div className="rounded-xl border border-rf-border bg-rf-bg-elevated p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-rf-fg">
          <input
            type="checkbox"
            name="isBreaking"
            checked={isBreaking}
            onChange={(event) => setIsBreaking(event.target.checked)}
            className="h-4 w-4 rounded border-rf-border accent-rf-live"
          />
          <AlertTriangle size={16} className="text-rf-live" />
          Marquer comme information urgente (Breaking News)
        </label>
        <p className="mt-1.5 text-xs text-rf-fg-subtle">
          Affiche un bandeau sur tout le site pendant 24h après la publication.
        </p>

        {isBreaking && (
          <div className="mt-3">
            <FieldGroup label="Niveau de priorité" htmlFor="breakingPriority">
              <AdminSelect id="breakingPriority" name="breakingPriority" defaultValue={initial?.breakingPriority ?? "HIGH"}>
                <option value="HIGH">Élevée</option>
                <option value="URGENT">Urgente</option>
              </AdminSelect>
            </FieldGroup>
          </div>
        )}
      </div>

      <FieldGroup label="Image de couverture" htmlFor="coverImage" hint="JPG, PNG ou WebP, 8 Mo maximum.">
        <input
          id="coverImage"
          name="coverImage"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-rf-fg-muted file:mr-4 file:rounded-lg file:border-0 file:bg-rf-gold file:px-4 file:py-2 file:text-sm file:font-bold file:text-rf-bg file:cursor-pointer"
        />
        {preview && (
          <div className="relative mt-3 aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-rf-border bg-rf-bg-elevated">
            <Image src={preview} alt="Aperçu de l'image de couverture" fill unoptimized className="object-cover" />
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="Contenu" htmlFor="content" hint="Laisse une ligne vide entre deux paragraphes.">
        <AdminTextarea
          id="content"
          name="content"
          ref={contentRef}
          defaultValue={initial?.content}
          rows={14}
          required
          placeholder="Écris l'article ici…"
        />
      </FieldGroup>

      {error && <Banner kind="error">{error}</Banner>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <AdminButton
          type="button"
          variant="secondary"
          disabled={pending !== null}
          onClick={() => handleSave("DRAFT")}
          className="w-full sm:w-auto"
        >
          {pending === "DRAFT" ? "Enregistrement…" : "Enregistrer comme brouillon"}
        </AdminButton>
        <AdminButton type="button" disabled={pending !== null} onClick={() => handleSave("PUBLISHED")} className="w-full sm:w-auto">
          {pending === "PUBLISHED" ? "Publication…" : "Publier"}
        </AdminButton>
      </div>
    </form>
  );
}
