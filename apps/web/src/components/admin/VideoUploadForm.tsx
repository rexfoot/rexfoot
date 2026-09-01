"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { AdminInput, AdminTextarea, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";

type Phase = "idle" | "creating" | "uploading" | "processing" | "ready" | "background" | "error";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PHASE_LABELS: Record<Phase, string> = {
  idle: "",
  creating: "Préparation de l'envoi…",
  uploading: "Envoi de la vidéo vers Cloudflare…",
  processing: "Vidéo envoyée, traitement en cours…",
  ready: "Vidéo prête et publiée !",
  background: "Toujours en traitement — elle apparaîtra automatiquement une fois prête.",
  error: "",
};

export function VideoUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function pollUntilReady(videoId: string) {
    setPhase("processing");
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const response = await fetch(`/api/admin/videos/${videoId}/sync`, { method: "POST" });
      if (!response.ok) continue;
      const body = (await response.json()) as { status: "PROCESSING" | "READY" | "FAILED" };
      if (body.status === "READY") {
        setPhase("ready");
        return;
      }
      if (body.status === "FAILED") {
        setError("Cloudflare n'a pas réussi à traiter cette vidéo. Vérifie le format et réessaie.");
        setPhase("error");
        return;
      }
    }
    setPhase("background");
  }

  async function handleUpload() {
    if (!formRef.current) return;
    if (!file) {
      setError("Choisis un fichier vidéo avant de continuer.");
      return;
    }
    setError(null);
    setPhase("creating");

    const formData = new FormData(formRef.current);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    const createResponse = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (!createResponse.ok) {
      const body = await createResponse.json().catch(() => null);
      setError(body?.error ?? "Impossible de préparer l'envoi. Réessaie.");
      setPhase("error");
      return;
    }
    const { id, uploadUrl } = (await createResponse.json()) as { id: string; uploadUrl: string };

    setPhase("uploading");
    const uploadBody = new FormData();
    uploadBody.set("file", file);
    const uploadResponse = await fetch(uploadUrl, { method: "POST", body: uploadBody });
    if (!uploadResponse.ok) {
      setError("L'envoi vers Cloudflare a échoué. Vérifie ta connexion et réessaie.");
      setPhase("error");
      return;
    }

    await pollUntilReady(id);
  }

  const isBusy = phase === "creating" || phase === "uploading" || phase === "processing";

  if (phase === "ready" || phase === "background") {
    return (
      <div className="max-w-2xl space-y-5">
        <Banner kind="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {PHASE_LABELS[phase]}
          </span>
        </Banner>
        <div className="flex flex-col gap-3 sm:flex-row">
          <AdminButton onClick={() => router.push("/admin/videos")} className="w-full sm:w-auto">
            Voir la liste des vidéos
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => router.refresh()} className="w-full sm:w-auto">
            Ajouter une autre vidéo
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} className="max-w-2xl space-y-5">
      <FieldGroup label="Titre" htmlFor="title">
        <AdminInput id="title" name="title" required disabled={isBusy} placeholder="Ex. Tous les buts de la 5e journée" />
      </FieldGroup>

      <FieldGroup label="Description (optionnel)" htmlFor="description">
        <AdminTextarea id="description" name="description" rows={3} disabled={isBusy} placeholder="Décris la vidéo en quelques mots" />
      </FieldGroup>

      <FieldGroup label="Fichier vidéo" htmlFor="file" hint="Formats courants (MP4, MOV…), jusqu'à 200 Mo.">
        <input
          id="file"
          name="file"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={isBusy}
          className="block w-full text-sm text-rf-fg-muted file:mr-4 file:rounded-lg file:border-0 file:bg-rf-gold file:px-4 file:py-2 file:text-sm file:font-bold file:text-rf-bg file:cursor-pointer disabled:opacity-50"
        />
      </FieldGroup>

      {isBusy && (
        <Banner kind="success">
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {PHASE_LABELS[phase]}
          </span>
        </Banner>
      )}
      {error && <Banner kind="error">{error}</Banner>}

      <AdminButton type="button" onClick={handleUpload} disabled={isBusy} className="w-full sm:w-auto">
        {isBusy ? "Envoi en cours…" : "Publier la vidéo"}
      </AdminButton>
    </form>
  );
}
