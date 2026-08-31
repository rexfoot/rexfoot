import Image from "next/image";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";

interface CompetitionBadgeProps {
  logoUrl?: string | null;
  name: string;
  className?: string;
}

/** Chip logo + nom de compétition, utilisé dans les listes de matchs et classements. */
export function CompetitionBadge({ logoUrl, name, className }: CompetitionBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-rf-fg-muted", className)}>
      {logoUrl ? (
        <Image src={logoUrl} alt="" width={16} height={16} className="h-4 w-4 object-contain" unoptimized />
      ) : (
        <Trophy size={14} className="text-rf-fg-subtle" />
      )}
      {name}
    </span>
  );
}
