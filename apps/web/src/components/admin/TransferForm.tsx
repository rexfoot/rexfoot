"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { TransferStatus } from "@rexfoot/db";
import { AdminInput, AdminTextarea, AdminSelect, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";
import { TRANSFER_STATUS_VALUES, TRANSFER_STATUS_LABELS } from "@/lib/transfer-status";

interface TransferFormInitial {
  playerName: string;
  fromClubName: string;
  toClubName: string;
  status: TransferStatus;
  feeMillionEur: string;
  isFree: boolean;
  transferDate: string;
  sourceName: string;
  sourceUrl: string;
  notes: string;
}

interface TransferFormProps {
  mode: "create" | "edit";
  transferId?: string;
  initial?: TransferFormInitial;
}

/** Formulaire partagé entre "Nouveau transfert" et "Modifier" — deux boutons d'enregistrement (brouillon/publié). */
export function TransferForm({ mode, transferId, initial }: TransferFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const playerNameRef = useRef<HTMLInputElement>(null);
  const fromClubRef = useRef<HTMLInputElement>(null);
  const toClubRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLSelectElement>(null);
  const feeRef = useRef<HTMLInputElement>(null);
  const sourceNameRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [isFree, setIsFree] = useState(initial?.isFree ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerateNotes() {
    const playerName = playerNameRef.current?.value.trim();
    if (!playerName) {
      setAiError("Renseigne au moins le nom du joueur avant de générer un texte.");
      return;
    }

    setAiPending(true);
    setAiError(null);

    const feeRaw = feeRef.current?.value.trim();
    const response = await fetch("/api/admin/transfers/ai-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName,
        fromClubName: fromClubRef.current?.value.trim() || undefined,
        toClubName: toClubRef.current?.value.trim() || undefined,
        status: statusRef.current?.value,
        feeMillionEur: !isFree && feeRaw ? Number(feeRaw) : undefined,
        isFree,
        sourceName: sourceNameRef.current?.value.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setAiError(body?.error ?? "Échec de la génération, réessaie.");
      setAiPending(false);
      return;
    }

    const { notes } = (await response.json()) as { notes: string };
    if (notesRef.current) notesRef.current.value = notes;
    setAiPending(false);
  }

  async function handleSave(published: boolean) {
    if (!formRef.current) return;
    setError(null);
    setPending(published ? "publish" : "draft");

    const formData = new FormData(formRef.current);
    const feeRaw = String(formData.get("feeMillionEur") ?? "").trim();

    const payload = {
      playerName: formData.get("playerName"),
      fromClubName: formData.get("fromClubName"),
      toClubName: formData.get("toClubName"),
      status: formData.get("status"),
      feeMillionEur: feeRaw ? Number(feeRaw) : undefined,
      isFree,
      transferDate: formData.get("transferDate") || undefined,
      sourceName: formData.get("sourceName"),
      sourceUrl: formData.get("sourceUrl"),
      notes: formData.get("notes"),
      published,
    };

    const endpoint = mode === "create" ? "/api/admin/transfers" : `/api/admin/transfers/${transferId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Une erreur est survenue, réessaie.");
      setPending(null);
      return;
    }

    router.push("/admin/transfers?saved=1");
    router.refresh();
  }

  return (
    <form ref={formRef} className="max-w-xl space-y-5">
      <FieldGroup label="Joueur" htmlFor="playerName">
        <AdminInput
          id="playerName"
          name="playerName"
          ref={playerNameRef}
          defaultValue={initial?.playerName}
          required
          placeholder="Ex. Kylian Mbappé"
        />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Club actuel" htmlFor="fromClubName">
          <AdminInput id="fromClubName" name="fromClubName" ref={fromClubRef} defaultValue={initial?.fromClubName} placeholder="Ex. PSG" />
        </FieldGroup>
        <FieldGroup label="Club de destination" htmlFor="toClubName">
          <AdminInput
            id="toClubName"
            name="toClubName"
            ref={toClubRef}
            defaultValue={initial?.toClubName}
            placeholder="Ex. Real Madrid"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Statut / niveau de fiabilité" htmlFor="status">
        <AdminSelect id="status" name="status" ref={statusRef} defaultValue={initial?.status ?? "RUMEUR"}>
          {TRANSFER_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {TRANSFER_STATUS_LABELS[value]}
            </option>
          ))}
        </AdminSelect>
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Montant (millions €)" htmlFor="feeMillionEur" hint="Laisse vide si inconnu.">
          <AdminInput
            id="feeMillionEur"
            name="feeMillionEur"
            ref={feeRef}
            type="number"
            step="0.1"
            min="0"
            disabled={isFree}
            defaultValue={initial?.feeMillionEur}
            placeholder="Ex. 75"
          />
        </FieldGroup>
        <FieldGroup label="Date du transfert" htmlFor="transferDate">
          <AdminInput id="transferDate" name="transferDate" type="date" defaultValue={initial?.transferDate} />
        </FieldGroup>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-rf-fg">
        <input
          type="checkbox"
          checked={isFree}
          onChange={(event) => setIsFree(event.target.checked)}
          className="h-4 w-4 rounded border-rf-border accent-rf-gold"
        />
        Transfert libre (sans indemnité)
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Source (nom)" htmlFor="sourceName">
          <AdminInput
            id="sourceName"
            name="sourceName"
            ref={sourceNameRef}
            defaultValue={initial?.sourceName}
            placeholder="Ex. Fabrizio Romano"
          />
        </FieldGroup>
        <FieldGroup label="Source (lien, optionnel)" htmlFor="sourceUrl">
          <AdminInput id="sourceUrl" name="sourceUrl" type="url" defaultValue={initial?.sourceUrl} placeholder="https://..." />
        </FieldGroup>
      </div>

      <FieldGroup label="Notes (optionnel)" htmlFor="notes">
        <AdminTextarea
          id="notes"
          name="notes"
          ref={notesRef}
          rows={3}
          defaultValue={initial?.notes}
          placeholder="Détails complémentaires"
        />
        <button
          type="button"
          onClick={handleGenerateNotes}
          disabled={aiPending}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-rf-gold transition-colors hover:text-rf-gold-soft disabled:opacity-50"
        >
          <Sparkles size={15} />
          {aiPending ? "Génération…" : "Générer avec l'IA"}
        </button>
        {aiError && <p className="mt-1 text-xs text-rf-live">{aiError}</p>}
      </FieldGroup>

      {error && <Banner kind="error">{error}</Banner>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <AdminButton
          type="button"
          variant="secondary"
          disabled={pending !== null}
          onClick={() => handleSave(false)}
          className="w-full sm:w-auto"
        >
          {pending === "draft" ? "Enregistrement…" : "Enregistrer comme brouillon"}
        </AdminButton>
        <AdminButton type="button" disabled={pending !== null} onClick={() => handleSave(true)} className="w-full sm:w-auto">
          {pending === "publish" ? "Publication…" : "Publier"}
        </AdminButton>
      </div>
    </form>
  );
}
