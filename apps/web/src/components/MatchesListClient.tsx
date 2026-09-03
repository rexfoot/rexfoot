"use client";

import { CalendarX } from "lucide-react";
import { MatchCard } from "./MatchCard";
import { EmptyState } from "./EmptyState";
import { useMatchesList } from "@/hooks/useMatchesList";
import type { MatchSummary } from "@/lib/types";

const DEFAULT_LIST_CLASSNAME = "grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

interface MatchesListClientProps {
  apiUrl: string;
  initialMatches: MatchSummary[];
  emptyTitle: string;
  emptyDescription?: string;
  /** Grille responsive par défaut (page /matches) ; passer "space-y-3" pour un empilement à une colonne (section accueil). */
  listClassName?: string;
}

/** Rend une liste de MatchCard et se maintient à jour tant qu'un match affiché est en direct. */
export function MatchesListClient({
  apiUrl,
  initialMatches,
  emptyTitle,
  emptyDescription,
  listClassName,
}: MatchesListClientProps) {
  const matches = useMatchesList(apiUrl, initialMatches);

  if (matches.length === 0) {
    return <EmptyState icon={CalendarX} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`grid ${listClassName ?? DEFAULT_LIST_CLASSNAME}`}>
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
