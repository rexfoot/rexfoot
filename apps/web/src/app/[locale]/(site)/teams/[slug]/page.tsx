import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTeamBySlug, getTeamFixtures } from "@/lib/data/teams";
import { TeamCrest } from "@/components/TeamCrest";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { MatchesListClient } from "@/components/MatchesListClient";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { FavoriteButton } from "@/components/FavoriteButton";
import { TrackView } from "@/components/TrackView";
import { buildAlternates } from "@/lib/seo/alternates";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [team, t, locale] = await Promise.all([getTeamBySlug(slug), getTranslations("teams"), getLocale()]);
  if (!team) return {};
  return {
    title: team.name,
    description: t("metaDescription", { name: team.name }),
    alternates: buildAlternates(`/teams/${slug}`, locale),
  };
}

export default async function TeamPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("teams");
  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  const fixtures = await getTeamFixtures(team.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    logo: team.crestUrl ?? undefined,
    sport: "Football",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackView entityType="TEAM" entityId={team.id} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="lg" />
          <div>
            <h1 className="font-display text-2xl font-bold text-rf-fg">{team.name}</h1>
            {team.venueName && <p className="text-sm text-rf-fg-muted">{team.venueName}</p>}
          </div>
        </div>
        <FavoriteButton entityType="TEAM" entityId={team.id} />
      </div>

      <section>
        <SectionHeader title={t("squadTitle")} />
        {team.playerMemberships.length === 0 ? (
          <EmptyState icon={Users} title={t("noSquad")} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {team.playerMemberships.map((membership) => (
              <Link
                key={membership.id}
                href={`/players/${membership.player.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-rf-border bg-rf-bg-card p-3 text-center transition-colors hover:border-rf-gold/40"
              >
                <PlayerAvatar photoUrl={membership.player.photoUrl} displayName={membership.player.displayName} />
                <span className="text-xs font-medium text-rf-fg">{membership.player.displayName}</span>
                {membership.shirtNumber && (
                  <span className="text-[11px] text-rf-fg-subtle">#{membership.shirtNumber}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title={t("matchesTitle")} />
        {/*
         * MatchesListClient (pas un simple map() server-side) — bug réel
         * constaté en prod (2026-09-05) : cette page a `revalidate = 3600`
         * (1h), et un <MatchCard> rendu directement avec les données serveur
         * ne se rafraîchit jamais côté client. Un match en direct au moment
         * du rendu pouvait donc rester affiché EN DIRECT avec un score figé
         * jusqu'à une heure après sa vraie fin. MatchesListClient poll via
         * /api/matches (voir son nouveau paramètre `team`) comme sur
         * l'accueil et /matches, indépendamment du cache de la page.
         */}
        <MatchesListClient
          apiUrl={`/api/matches?team=${team.slug}`}
          initialMatches={fixtures.map((f) => ({ ...f, kickoffAt: f.kickoffAt.toISOString() }))}
          emptyTitle={t("noMatches")}
          listClassName="grid-cols-1 gap-3 sm:grid-cols-2"
        />
      </section>
    </div>
  );
}
