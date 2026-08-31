"use client";

import { CalendarX } from "lucide-react";
import { MatchCard } from "./MatchCard";
import { EmptyState } from "./EmptyState";
import { useMatchesList } from "@/hooks/useMatchesList";
import type { MatchSummary } from "@/lib/types";

interface MatchesListClientProps {
  apiUrl: string;
  initialMatches: MatchSummary[];
  emptyTitle: string;
  emptyDescription?: string;
}

/** Rend une liste de MatchCard et se maintient à jour tant qu'un match affiché est en direct. */
export function MatchesListClient({ apiUrl, initialMatches, emptyTitle, emptyDescription }: MatchesListClientProps) {
  const matches = useMatchesList(apiUrl, initialMatches);

  if (matches.length === 0) {
    return <EmptyState icon={CalendarX} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
