import { useTranslations, useLocale } from "next-intl";
import { ArrowRight } from "lucide-react";
import type { Transfer } from "@rexfoot/db";
import { TRANSFER_STATUS_STYLES } from "@/lib/transfer-status";
import { toIntlLocale } from "@/lib/intl-locale";
import { cn } from "@/lib/cn";

function formatDate(date: Date | null, locale: string): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function TransferCard({ transfer }: { transfer: Transfer }) {
  const t = useTranslations("mercato");
  const locale = useLocale();
  const fee = transfer.isFree ? t("freeTransfer") : transfer.feeMillionEur !== null ? `${transfer.feeMillionEur}M€` : null;
  const date = formatDate(transfer.transferDate, toIntlLocale(locale));

  return (
    <div className="rounded-2xl border border-rf-border bg-rf-bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", TRANSFER_STATUS_STYLES[transfer.status])}>
          {t(`status.${transfer.status}`)}
        </span>
        {date && <span className="text-xs text-rf-fg-subtle">{date}</span>}
      </div>

      <p className="font-display text-lg font-bold text-rf-fg">{transfer.playerName}</p>

      <div className="mt-2 flex items-center gap-2 text-sm text-rf-fg-muted">
        <span className="truncate">{transfer.fromClubName ?? t("freeClub")}</span>
        <ArrowRight size={14} className="shrink-0 text-rf-fg-subtle rtl:rotate-180" />
        <span className="truncate font-medium text-rf-fg">{transfer.toClubName ?? t("unknownDestination")}</span>
      </div>

      {fee && <p className="mt-2 text-sm font-semibold text-rf-gold">{fee}</p>}
      {transfer.notes && <p className="mt-2 text-sm text-rf-fg-muted">{transfer.notes}</p>}

      {transfer.sourceName && (
        <p className="mt-3 text-xs text-rf-fg-subtle">
          {t("source")} :{" "}
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
