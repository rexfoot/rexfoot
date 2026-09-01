"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminInput, AdminTextarea, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";

interface VideoEditFormProps {
  videoId: string;
  initial: { title: string; description: string };
}

export function VideoEditForm({ videoId, initial }: VideoEditFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!formRef.current) return;
    setError(null);
    setSaving(true);

    const formData = new FormData(formRef.current);
    const response = await fetch(`/api/admin/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formData.get("title"), description: formData.get("description") }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Une erreur est survenue, réessaie.");
      setSaving(false);
      return;
    }

    router.push("/admin/videos?saved=1");
    router.refresh();
  }

  return (
    <form ref={formRef} className="max-w-2xl space-y-5">
      <FieldGroup label="Titre" htmlFor="title">
        <AdminInput id="title" name="title" defaultValue={initial.title} required />
      </FieldGroup>
      <FieldGroup label="Description (optionnel)" htmlFor="description">
        <AdminTextarea id="description" name="description" defaultValue={initial.description} rows={3} />
      </FieldGroup>

      {error && <Banner kind="error">{error}</Banner>}

      <AdminButton type="button" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Enregistrement…" : "Enregistrer"}
      </AdminButton>
    </form>
  );
}
