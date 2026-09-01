import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { getPlayerBySlug } from "@/lib/data/players";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { FavoriteButton } from "@/components/FavoriteButton";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const POSITION_LABEL: Record<string, string> = {
  GOALKEEPER: "Gardien",
  DEFENDER: "Défenseur",
  MIDFIELDER: "Milieu",
  FORWARD: "Attaquant",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) return {};
  return {
    title: player.displayName,
    description: `${player.displayName} — profil, statistiques et historique sur RexFoot.`,
  };
}

export default async function PlayerPage({ params }: PageProps) {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) notFound();

  const currentTeam = player.teamMemberships[0]?.team;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.displayName,
    nationality: player.nationality ?? undefined,
    image: player.photoUrl ?? undefined,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PlayerAvatar photoUrl={player.photoUrl} displayName={player.displayName} size="lg" />
          <div>
            <h1 className="font-display text-2xl font-bold text-rf-fg">{player.displayName}</h1>
            <p className="text-sm text-rf-fg-muted">
              {player.position ? POSITION_LABEL[player.position] : "Poste inconnu"}
              {currentTeam && ` · ${currentTeam.name}`}
              {player.nationality && ` · ${player.nationality}`}
            </p>
          </div>
        </div>
        <FavoriteButton entityType="PLAYER" entityId={player.id} />
      </div>

      <section>
        <SectionHeader title="Statistiques récentes" />
        {player.statistics.length === 0 ? (
          <EmptyState icon={BarChart3} title="Pas encore de statistiques disponibles" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-rf-border">
            <table className="w-full text-sm">
              <thead className="bg-rf-bg-elevated text-left text-rf-fg-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Min</th>
                  <th className="px-4 py-2 font-medium">Buts</th>
                  <th className="px-4 py-2 font-medium">Passes D.</th>
                  <th className="px-4 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {player.statistics.map((stat) => (
                  <tr key={stat.id} className="border-t border-rf-border">
                    <td className="px-4 py-2 text-rf-fg-muted">
                      {new Date(stat.fixture.kickoffAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 text-rf-fg">{stat.minutesPlayed ?? "–"}</td>
                    <td className="px-4 py-2 text-rf-fg">{stat.goals ?? 0}</td>
                    <td className="px-4 py-2 text-rf-fg">{stat.assists ?? 0}</td>
                    <td className="px-4 py-2 text-rf-fg">{stat.rating?.toFixed(1) ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
