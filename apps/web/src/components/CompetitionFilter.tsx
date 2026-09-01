import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

interface CompetitionFilterProps {
  competitions: { slug: string; name: string; logoUrl: string | null }[];
  selected?: string;
  date?: string;
}

function buildHref(date: string | undefined, competitionSlug?: string): string {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (competitionSlug) params.set("competition", competitionSlug);
  const query = params.toString();
  return query ? `/matches?${query}` : "/matches";
}

/** Filtre par compétition — simples liens (pas de JS nécessaire), l'état vient de l'URL. */
export function CompetitionFilter({ competitions, selected, date }: CompetitionFilterProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <Link
        href={buildHref(date)}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
          !selected
            ? "border-rf-gold/40 bg-rf-gold/15 text-rf-gold"
            : "border-rf-border text-rf-fg-muted hover:border-rf-gold/40 hover:text-rf-fg",
        )}
      >
        Toutes
      </Link>
      {competitions.map((competition) => (
        <Link
          key={competition.slug}
          href={buildHref(date, competition.slug)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            selected === competition.slug
              ? "border-rf-gold/40 bg-rf-gold/15 text-rf-gold"
              : "border-rf-border text-rf-fg-muted hover:border-rf-gold/40 hover:text-rf-fg",
          )}
        >
          {competition.logoUrl && (
            <Image src={competition.logoUrl} alt="" width={16} height={16} className="h-4 w-4 object-contain" unoptimized />
          )}
          {competition.name}
        </Link>
      ))}
    </div>
  );
}
