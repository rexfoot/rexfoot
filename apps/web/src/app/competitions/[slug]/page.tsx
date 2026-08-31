import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListOrdered, CalendarDays } from "lucide-react";
import {
  getCompetitionBySlug,
  getFixturesForCompetition,
  getStandingsForCompetition,
} from "@/lib/data/competitions";
import { TeamCrest } from "@/components/TeamCrest";
import { CompetitionBadge } from "@/components/CompetitionBadge";
import { MatchCard } from "@/components/MatchCard";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const competition = await getCompetitionBySlug(slug);
  if (!competition) return {};
  return {
    title: competition.name,
    description: `${competition.name} — classement, calendrier et résultats sur RexFoot.`,
  };
}

export default async function CompetitionPage({ params }: PageProps) {
  const { slug } = await params;
  const competition = await getCompetitionBySlug(slug);
  if (!competition) notFound();

  const season = competition.seasons[0];
  const [standings, fixtures] = season
    ? await Promise.all([
        getStandingsForCompetition(competition.id, season.id),
        getFixturesForCompetition(competition.id, season.id),
      ])
    : [[], []];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: competition.name,
    logo: competition.logoUrl ?? undefined,
    sport: "Football",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex items-center gap-3">
        <CompetitionBadge logoUrl={competition.logoUrl} name={competition.name} className="text-base" />
      </div>
      <h1 className="font-display text-2xl font-bold text-rf-fg">{competition.name}</h1>

      <section>
        <SectionHeader title="Classement" />
        {standings.length === 0 ? (
          <EmptyState icon={ListOrdered} title="Classement pas encore disponible" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-rf-border">
            <table className="w-full text-sm">
              <thead className="bg-rf-bg-elevated text-left text-rf-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Équipe</th>
                  <th className="px-3 py-2 text-center font-medium">J</th>
                  <th className="px-3 py-2 text-center font-medium">Diff</th>
                  <th className="px-3 py-2 text-center font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.id} className="border-t border-rf-border">
                    <td className="px-3 py-2 text-rf-fg-muted">{row.position}</td>
                    <td className="px-3 py-2">
                      <a href={`/teams/${row.team.slug}`} className="flex items-center gap-2 font-medium text-rf-fg">
                        <TeamCrest crestUrl={row.team.crestUrl} teamName={row.team.name} size="sm" />
                        {row.team.name}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.played}</td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.goalDifference}</td>
                    <td className="px-3 py-2 text-center font-bold text-rf-fg">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Calendrier" />
        {fixtures.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Aucun match programmé pour l'instant" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fixtures.map((fixture) => (
              <MatchCard
                key={fixture.id}
                match={{
                  ...fixture,
                  kickoffAt: fixture.kickoffAt.toISOString(),
                  competition: { name: competition.name, slug: competition.slug, logoUrl: competition.logoUrl },
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
