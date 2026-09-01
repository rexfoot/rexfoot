import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";

/** Pastille distinguant les articles d'analyse tactique du reste des actualités. */
export function AnalysisBadge({ className }: { className?: string }) {
  const t = useTranslations("analysis");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-rf-gold/15 px-2.5 py-1 text-xs font-bold tracking-wide text-rf-gold uppercase ${className ?? ""}`}
    >
      <BarChart3 size={12} className="shrink-0" />
      {t("badge")}
    </span>
  );
}
