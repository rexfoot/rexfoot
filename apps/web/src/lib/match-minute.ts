import type { MatchEventSummary } from "./types";

/**
 * football-data.org ne renvoie pas toujours un minutage pour un match LIVE
 * (constaté en prod) — plutôt que d'afficher un "0'" trompeur (StatusBadge
 * dans MatchCard.tsx, useStatusLabel dans MatchDetailClient.tsx), on retombe
 * sur la minute du dernier événement Highlightly connu ; s'il n'y en a
 * aucun non plus, l'appelant doit afficher le libellé "EN DIRECT" seul.
 */
export function bestKnownMinute(minute: number | null, events: MatchEventSummary[]): number | null {
  if (minute !== null) return minute;
  if (events.length === 0) return null;
  return Math.max(...events.map((e) => e.minute));
}
