import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { ListOrdered, CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getCompetitionBySlug,
  getFixturesForCompetition,
  getStandingsForCompetition,
  hasCompetitionData,
} from "@/lib/data/competitions";
import { buildAlternates } from "@/lib/seo/alternates";
import { TeamCrest } from "@/components/TeamCrest";
import { CompetitionBadge } from "@/components/CompetitionBadge";
import { MatchCard } from "@/components/MatchCard";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { FormBadge } from "@/components/FormBadge";
import { FavoriteButton } from "@/components/FavoriteButton";

// Était 3600 (1h) — bug réel constaté en prod (2026-09-05) : cette page
// rend <MatchCard> directement avec les données serveur (sans le mécanisme
// de polling client de MatchesListClient), donc un match en direct au
// moment du rendu restait affiché EN DIRECT avec son ancien score jusqu'à
// une heure après sa vraie fin. Pas remplacé par MatchesListClient comme
// teams/[slug] : getFixturesForCompetition() renvoie TOUTE la saison (pas
// de plafond), alors que /api/matches est paginé à PAGE_SIZE_MATCHES —
// switcher aurait fait disparaître la plupart des matchs de la page.
// Resserrer `revalidate` reste une vraie amélioration (jusqu'à 1h de retard
// possible -> 1 min) sans ce compromis.
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [competition, t, locale] = await Promise.all([
    getCompetitionBySlug(slug),
    getTranslations("standings"),
    getLocale(),
  ]);
  if (!competition) return {};
  // Page vide (aucune saison en cours, ni classement ni calendrier) : noindex
  // AUTOMATIQUE et TEMPORAIRE — la page reste en ligne (URL intacte, liens
  // suivis) et redevient indexable seule dès que le worker synchronise des
  // données (metadata recalculée à chaque revalidate, 60 s).
  const season = competition.seasons[0];
  const hasData = season ? await hasCompetitionData(competition.id, season.id) : false;
  return {
    title: competition.name,
    description: t("metaDescriptionDetail", { name: competition.name }),
    alternates: buildAlternates(`/competitions/${slug}`, locale),
    robots: hasData ? undefined : { index: false, follow: true },
  };
}

export default async function CompetitionPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("standings");
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

      <div className="flex items-center justify-between gap-3">
        <CompetitionBadge logoUrl={competition.logoUrl} name={competition.name} className="text-base" />
        <FavoriteButton entityType="COMPETITION" entityId={competition.id} />
      </div>
      <h1 className="font-display text-2xl font-bold text-rf-fg">{competition.name}</h1>

      <section>
        <SectionHeader title={t("standingsSectionTitle")} />
        {standings.length === 0 ? (
          <EmptyState icon={ListOrdered} title={t("noStandings")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-rf-border">
            <table className="w-full text-sm">
              <thead className="bg-rf-bg-elevated text-left text-rf-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("position")}</th>
                  <th className="px-3 py-2 font-medium">{t("team")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("played")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("won")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("drawn")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("lost")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("goalsFor")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("goalsAgainst")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("goalDifference")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("points")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("form")}</th>
                </tr>
              </thead>
              <tbody className="[font-variant-numeric:tabular-nums]">
                {standings.map((row) => (
                  <tr key={row.id} className="border-t border-rf-border">
                    <td className="px-3 py-2 text-rf-fg-muted">{row.position}</td>
                    <td className="px-3 py-2">
                      <Link href={`/teams/${row.team.slug}`} className="flex items-center gap-2 font-medium text-rf-fg">
                        <TeamCrest crestUrl={row.team.crestUrl} teamName={row.team.name} size="sm" />
                        {row.team.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.played}</td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.won}</td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.drawn}</td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.lost}</td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.goalsFor}</td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.goalsAgainst}</td>
                    <td className="px-3 py-2 text-center text-rf-fg-muted">{row.goalDifference}</td>
                    <td className="px-3 py-2 text-center font-bold text-rf-fg">{row.points}</td>
                    <td className="px-3 py-2">
                      <FormBadge form={row.form} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title={t("calendarSectionTitle")} />
        {fixtures.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t("noFixtures")} />
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
