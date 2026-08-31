import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

/**
 * État vide générique. RexFoot ne doit jamais afficher de fausses données —
 * tant qu'aucune clé API football ou aucun contenu n'existe, les pages
 * rendent cet état plutôt que des données inventées.
 */
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rf-border px-6 py-12 text-center">
      <Icon size={28} className="text-rf-fg-subtle" strokeWidth={1.5} />
      <p className="font-medium text-rf-fg">{title}</p>
      {description && <p className="max-w-xs text-sm text-rf-fg-muted">{description}</p>}
    </div>
  );
}
