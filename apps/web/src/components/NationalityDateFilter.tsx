import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type NationalityDateOption = "today" | "tomorrow" | "dayAfterTomorrow";

const OPTIONS: NationalityDateOption[] = ["today", "tomorrow", "dayAfterTomorrow"];

function href(nationality: string | undefined, date: NationalityDateOption): string {
  const params = new URLSearchParams();
  if (nationality) params.set("nationality", nationality);
  if (date !== "today") params.set("date", date);
  const query = params.toString();
  return query ? `/nationalite?${query}` : "/nationalite";
}

export function NationalityDateFilter({
  nationality,
  selected,
}: {
  nationality?: string;
  selected: NationalityDateOption;
}) {
  const t = useTranslations("nationality");

  return (
    <div className="flex gap-2 overflow-x-auto">
      {OPTIONS.map((date) => (
        <Link
          key={date}
          href={href(nationality, date)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            selected === date
              ? "border-rf-gold/40 bg-rf-gold/15 text-rf-gold"
              : "border-rf-border text-rf-fg-muted hover:border-rf-gold/40 hover:text-rf-fg",
          )}
        >
          {t(date)}
        </Link>
      ))}
    </div>
  );
}
