"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { AdminButton, Banner, FieldGroup } from "@/components/admin/ui";

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
  ready: "Vidéo prête !",
  background: "Toujours en traitement — elle apparaîtra automatiquement une fois prête.",
  error: "",
};

interface TalentVideoUploadProps {
  talentId: string;
  hasExistingVideo: boolean;
}

/** Même mécanique que VideoUploadForm.tsx, ciblée sur /api/admin/talents/[id]/video — voir son commentaire. */
export function TalentVideoUpload({ talentId, hasExistingVideo }: TalentVideoUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function pollUntilReady() {
    setPhase("processing");
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const response = await fetch(`/api/admin/talents/${talentId}/video/sync`, { method: "POST" });
      if (!response.ok) continue;
      const body = (await response.json()) as { status: "PROCESSING" | "READY" | "FAILED" };
      if (body.status === "READY") {
        setPhase("ready");
        router.refresh();
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
    if (!file) {
      setError("Choisis un fichier vidéo avant de continuer.");
      return;
    }
    setError(null);
    setPhase("creating");

    const createResponse = await fetch(`/api/admin/talents/${talentId}/video`, { method: "POST" });
    if (!createResponse.ok) {
      const body = await createResponse.json().catch(() => null);
      setError(body?.error ?? "Impossible de préparer l'envoi. Réessaie.");
      setPhase("error");
      return;
    }
    const { uploadUrl } = (await createResponse.json()) as { id: string; uploadUrl: string };

    setPhase("uploading");
    const uploadBody = new FormData();
    uploadBody.set("file", file);
    const uploadResponse = await fetch(uploadUrl, { method: "POST", body: uploadBody });
    if (!uploadResponse.ok) {
      setError("L'envoi vers Cloudflare a échoué. Vérifie ta connexion et réessaie.");
      setPhase("error");
      return;
    }

    await pollUntilReady();
  }

  const isBusy = phase === "creating" || phase === "uploading" || phase === "processing";

  return (
    <FieldGroup
      label="Vidéo du joueur"
      htmlFor="talentVideoFile"
      hint={hasExistingVideo ? "Une vidéo est déjà attachée — en envoyer une nouvelle la remplace." : "Reçue sur WhatsApp, à re-envoyer ici. Formats courants (MP4, MOV…), jusqu'à 200 Mo."}
    >
      <input
        id="talentVideoFile"
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        disabled={isBusy}
        className="block w-full text-sm text-rf-fg-muted file:mr-4 file:rounded-lg file:border-0 file:bg-rf-orange file:px-4 file:py-2 file:text-sm file:font-bold file:text-rf-bg file:cursor-pointer disabled:opacity-50"
      />

      {(phase === "ready" || phase === "background") && (
        <Banner kind="success">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {PHASE_LABELS[phase]}
          </span>
        </Banner>
      )}
      {isBusy && (
        <Banner kind="success">
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {PHASE_LABELS[phase]}
          </span>
        </Banner>
      )}
      {error && <Banner kind="error">{error}</Banner>}

      <AdminButton type="button" variant="secondary" onClick={handleUpload} disabled={isBusy} className="mt-3">
        {isBusy ? "Envoi en cours…" : hasExistingVideo ? "Remplacer la vidéo" : "Envoyer la vidéo"}
      </AdminButton>
    </FieldGroup>
  );
}
