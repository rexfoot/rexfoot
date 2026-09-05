import type { MatchEventSummary } from "./types";

/**
 * Marge au-delà de laquelle une minute connue (fournisseur ou dernier
 * événement) est considérée périmée plutôt que réellement figée sur le
 * terrain — couvre la mi-temps (~15 min) plus une marge de temps additionnel/
 * retard d'affichage raisonnable.
 */
const STALE_MINUTE_MARGIN_MINUTES = 25;

/**
 * football-data.org ne renvoie pas toujours un minutage pour un match LIVE
 * (constaté en prod) — plutôt que d'afficher un "0'" trompeur (StatusBadge
 * dans MatchCard.tsx, useStatusLabel dans MatchDetailClient.tsx), on retombe
 * sur la minute du dernier événement Highlightly connu ; s'il n'y en a
 * aucun non plus, l'appelant doit afficher le libellé "EN DIRECT" seul.
 *
 * Bug réel constaté en prod (2026-09-05) : quand Highlightly (source de la
 * minute et des événements) tombe à court de quota journalier, plus aucune
 * des deux sources n'est rafraîchie — le match affichait "18'" figé alors
 * que le coup d'envoi remontait à 85 minutes réelles (Fiorentina-Torino).
 * Le score/statut restaient corrects (football-data.org, fournisseur séparé
 * et non affecté), donc le match semblait "en direct" avec un chrono
 * visiblement faux plutôt que simplement en pause. Mieux vaut n'afficher
 * aucune minute (juste "EN DIRECT") qu'une minute qu'on sait erronée : on
 * compare donc la minute connue au temps réel écoulé depuis le coup d'envoi.
 */
export function bestKnownMinute(minute: number | null, events: MatchEventSummary[], kickoffAtIso: string): number | null {
  const known = minute ?? (events.length > 0 ? Math.max(...events.map((e) => e.minute)) : null);
  if (known === null) return null;

  const elapsedMinutes = (Date.now() - new Date(kickoffAtIso).getTime()) / 60_000;
  if (elapsedMinutes - known > STALE_MINUTE_MARGIN_MINUTES) return null;

  return known;
}
