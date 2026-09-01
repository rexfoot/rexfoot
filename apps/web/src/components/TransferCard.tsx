import { ArrowRight } from "lucide-react";
import type { Transfer } from "@rexfoot/db";
import { TRANSFER_STATUS_LABELS, TRANSFER_STATUS_STYLES } from "@/lib/transfer-status";
import { cn } from "@/lib/cn";

function formatFee(transfer: Pick<Transfer, "isFree" | "feeMillionEur">): string | null {
  if (transfer.isFree) return "Transfert libre";
  if (transfer.feeMillionEur === null) return null;
  return `${transfer.feeMillionEur}M€`;
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function TransferCard({ transfer }: { transfer: Transfer }) {
  const fee = formatFee(transfer);
  const date = formatDate(transfer.transferDate);

  return (
    <div className="rounded-2xl border border-rf-border bg-rf-bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", TRANSFER_STATUS_STYLES[transfer.status])}>
          {TRANSFER_STATUS_LABELS[transfer.status]}
        </span>
        {date && <span className="text-xs text-rf-fg-subtle">{date}</span>}
      </div>

      <p className="font-display text-lg font-bold text-rf-fg">{transfer.playerName}</p>

      <div className="mt-2 flex items-center gap-2 text-sm text-rf-fg-muted">
        <span className="truncate">{transfer.fromClubName ?? "Club libre"}</span>
        <ArrowRight size={14} className="shrink-0 text-rf-fg-subtle" />
        <span className="truncate font-medium text-rf-fg">{transfer.toClubName ?? "Destination inconnue"}</span>
      </div>

      {fee && <p className="mt-2 text-sm font-semibold text-rf-gold">{fee}</p>}
      {transfer.notes && <p className="mt-2 text-sm text-rf-fg-muted">{transfer.notes}</p>}

      {transfer.sourceName && (
        <p className="mt-3 text-xs text-rf-fg-subtle">
          Source :{" "}
          {transfer.sourceUrl ? (
            <a
              href={transfer.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rf-gold hover:underline"
            >
              {transfer.sourceName}
            </a>
          ) : (
            transfer.sourceName
          )}
        </p>
      )}
    </div>
  );
}
