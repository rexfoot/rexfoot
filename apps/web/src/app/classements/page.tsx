import type { Metadata } from "next";
import { ListOrdered } from "lucide-react";
import { getFeaturedCompetitions } from "@/lib/data/competitions";
import { CompetitionCard } from "@/components/CompetitionCard";
import { EmptyState } from "@/components/EmptyState";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Classements",
  description: "Classements des principaux championnats et compétitions de football.",
};

export default async function StandingsIndexPage() {
  const competitions = await getFeaturedCompetitions();

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">Classements</h1>

      {competitions.length === 0 ? (
        <EmptyState icon={ListOrdered} title="Aucune compétition disponible pour l'instant" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.slug} competition={competition} />
          ))}
        </div>
      )}
    </div>
  );
}
