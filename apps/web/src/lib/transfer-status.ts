import type { TransferStatus } from "@rexfoot/db";

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  OFFICIEL: "Officiel",
  AVANCE: "Avancé",
  EN_DISCUSSION: "En discussion",
  RUMEUR: "Rumeur",
};

export const TRANSFER_STATUS_VALUES = Object.keys(TRANSFER_STATUS_LABELS) as TransferStatus[];

/// Couleurs alignées sur le code couleur du plan (🟢 officiel, 🟠 avancé, 🟡 en discussion, 🔴 rumeur).
export const TRANSFER_STATUS_STYLES: Record<TransferStatus, string> = {
  OFFICIEL: "bg-rf-success/15 text-rf-success",
  AVANCE: "bg-orange-500/15 text-orange-400",
  EN_DISCUSSION: "bg-rf-gold/15 text-rf-gold",
  RUMEUR: "bg-rf-live/15 text-rf-live",
};

export function isTransferStatus(value: string | undefined): value is TransferStatus {
  return !!value && (TRANSFER_STATUS_VALUES as string[]).includes(value);
}
