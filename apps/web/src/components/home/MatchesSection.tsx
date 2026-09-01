import { getMatchesOfTheDay } from "@/lib/data/matches";
import { MatchesListClient } from "@/components/MatchesListClient";

/** Matchs du jour — fetch isolé pour streamer indépendamment des autres sections. */
export async function MatchesSection() {
  const matches = await getMatchesOfTheDay();
  const todayIso = new Date().toISOString();

  return (
    <MatchesListClient
      apiUrl={`/api/matches?date=${encodeURIComponent(todayIso)}`}
      initialMatches={matches}
      emptyTitle="Aucun match aujourd'hui"
      emptyDescription="Reviens plus tard, ou consulte le calendrier complet des compétitions."
    />
  );
}
