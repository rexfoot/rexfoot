import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

/** Pastille "BREAKING" réutilisée sur NewsCard/NewsHero — jamais affichée si l'article n'est plus dans la fenêtre active. */
export function BreakingBadge({ className }: { className?: string }) {
  const t = useTranslations("breakingNews");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-rf-live px-2.5 py-1 text-xs font-bold tracking-wide text-white uppercase ${className ?? ""}`}
    >
      <AlertTriangle size={12} className="shrink-0 animate-pulse" />
      {t("label")}
    </span>
  );
}
