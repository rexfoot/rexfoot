"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { NewsCategory } from "@rexfoot/db";
import { AdminInput, AdminTextarea, AdminSelect, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";
import { NEWS_CATEGORY_VALUES, NEWS_CATEGORY_LABELS } from "@/lib/news-categories";

type SaveStatus = "DRAFT" | "PUBLISHED";

interface NewsFormInitial {
  title: string;
  category: NewsCategory;
  summary: string;
  content: string;
  coverImageUrl: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<SaveStatus | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.coverImageUrl ?? null);

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
        <AdminTextarea id="summary" name="summary" defaultValue={initial?.summary} rows={2} placeholder="Résumé court" />
      </FieldGroup>

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
