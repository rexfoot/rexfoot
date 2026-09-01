"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [isFree, setIsFree] = useState(initial?.isFree ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"draft" | "publish" | null>(null);

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
        <AdminInput id="playerName" name="playerName" defaultValue={initial?.playerName} required placeholder="Ex. Kylian Mbappé" />
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldGroup label="Club actuel" htmlFor="fromClubName">
          <AdminInput id="fromClubName" name="fromClubName" defaultValue={initial?.fromClubName} placeholder="Ex. PSG" />
        </FieldGroup>
        <FieldGroup label="Club de destination" htmlFor="toClubName">
          <AdminInput id="toClubName" name="toClubName" defaultValue={initial?.toClubName} placeholder="Ex. Real Madrid" />
        </FieldGroup>
      </div>

      <FieldGroup label="Statut / niveau de fiabilité" htmlFor="status">
        <AdminSelect id="status" name="status" defaultValue={initial?.status ?? "RUMEUR"}>
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
          <AdminInput id="sourceName" name="sourceName" defaultValue={initial?.sourceName} placeholder="Ex. Fabrizio Romano" />
        </FieldGroup>
        <FieldGroup label="Source (lien, optionnel)" htmlFor="sourceUrl">
          <AdminInput id="sourceUrl" name="sourceUrl" type="url" defaultValue={initial?.sourceUrl} placeholder="https://..." />
        </FieldGroup>
      </div>

      <FieldGroup label="Notes (optionnel)" htmlFor="notes">
        <AdminTextarea id="notes" name="notes" rows={3} defaultValue={initial?.notes} placeholder="Détails complémentaires" />
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
