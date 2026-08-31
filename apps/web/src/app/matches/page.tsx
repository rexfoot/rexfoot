import type { Metadata } from "next";
import { getMatches } from "@/lib/data/matches";
import { MatchesListClient } from "@/components/MatchesListClient";

// Dynamique : évite tout appel Prisma au moment du `docker build` (DATABASE_URL
// n'existe qu'au runtime sur Railway) — voir page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Matchs",
  description: "Tous les matchs de football : en direct, résultats et calendrier à venir.",
};

export default async function MatchesPage() {
  const { matches } = await getMatches();

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Matchs</h1>
      <MatchesListClient
        apiUrl="/api/matches"
        initialMatches={matches}
        emptyTitle="Aucun match à afficher"
        emptyDescription="Les matchs apparaîtront ici une fois la synchronisation des données activée."
      />
    </div>
  );
}
