import { Link } from "@/i18n/navigation";
import type { TransferStatus } from "@rexfoot/db";
import { TRANSFER_STATUS_LABELS, TRANSFER_STATUS_VALUES } from "@/lib/transfer-status";
import { cn } from "@/lib/cn";

function href(status?: TransferStatus): string {
  return status ? `/mercato?status=${status}` : "/mercato";
}

export function TransferStatusFilter({ selected }: { selected?: TransferStatus }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <Link
        href={href()}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
          !selected
            ? "border-rf-gold/40 bg-rf-gold/15 text-rf-gold"
            : "border-rf-border text-rf-fg-muted hover:border-rf-gold/40 hover:text-rf-fg",
        )}
      >
        Tous
      </Link>
      {TRANSFER_STATUS_VALUES.map((status) => (
        <Link
          key={status}
          href={href(status)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            selected === status
              ? "border-rf-gold/40 bg-rf-gold/15 text-rf-gold"
              : "border-rf-border text-rf-fg-muted hover:border-rf-gold/40 hover:text-rf-fg",
          )}
        >
          {TRANSFER_STATUS_LABELS[status]}
        </Link>
      ))}
    </div>
  );
}
