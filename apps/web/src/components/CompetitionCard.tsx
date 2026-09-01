import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";

interface CompetitionCardProps {
  competition: { slug: string; name: string; logoUrl: string | null; countryName: string | null };
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  return (
    <Link
      href={`/competitions/${competition.slug}`}
      className="flex items-center gap-4 rounded-2xl border border-rf-border bg-rf-bg-card p-4 transition-colors hover:border-rf-gold/40"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rf-bg-elevated">
        {competition.logoUrl ? (
          <Image src={competition.logoUrl} alt="" width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
        ) : (
          <Trophy size={22} className="text-rf-fg-subtle" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-rf-fg">{competition.name}</p>
        {competition.countryName && <p className="truncate text-xs text-rf-fg-muted">{competition.countryName}</p>}
      </div>
    </Link>
  );
}
