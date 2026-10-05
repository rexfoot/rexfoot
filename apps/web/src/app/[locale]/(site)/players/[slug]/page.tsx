import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { BarChart3 } from "lucide-react";
import { getPlayerBySlug } from "@/lib/data/players";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/SectionHeader";
import { FavoriteButton } from "@/components/FavoriteButton";
import { TrackView } from "@/components/TrackView";
import { toIntlLocale } from "@/lib/intl-locale";
import { buildAlternates } from "@/lib/seo/alternates";
import type { PlayerPosition } from "@rexfoot/db";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const POSITION_KEY: Record<PlayerPosition, string> = {
  GOALKEEPER: "goalkeeper",
  DEFENDER: "defender",
  MIDFIELDER: "midfielder",
  FORWARD: "forward",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [player, t, locale] = await Promise.all([
    getPlayerBySlug(slug),
    getTranslations("players"),
    getLocale(),
  ]);
  if (!player) return {};
  // Joueur sans vraies données (ni photo, ni club actuel, ni stats) : noindex
  // AUTOMATIQUE et TEMPORAIRE — même principe que les compétitions : la page
  // reste en ligne (URL intacte) et redevient indexable seule dès que le
  // worker enrichit la fiche (photo, club, stats).
  const hasData =
    player.photoUrl !== null || player.teamMemberships.length > 0 || player.statistics.length > 0;
  return {
    title: player.displayName,
    description: t("metaDescription", { name: player.displayName }),
    alternates: buildAlternates(`/players/${slug}`, locale),
    robots: hasData ? undefined : { index: false, follow: true },
  };
}

export default async function PlayerPage({ params }: PageProps) {
  const { slug } = await params;
  const [player, t, locale] = await Promise.all([getPlayerBySlug(slug), getTranslations("players"), getLocale()]);
  if (!player) notFound();

  const currentTeam = player.teamMemberships[0]?.team;
  const intlLocale = toIntlLocale(locale);
  // La correction manuelle prime toujours sur la valeur du fournisseur, qui
  // accuse parfois des mois de retard sur un changement de sélection
  // nationale récent — voir nationalityOverride dans schema.prisma.
  const nationality = player.nationalityOverride ?? player.nationality;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.displayName,
    nationality: nationality ?? undefined,
    image: player.photoUrl ?? undefined,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackView entityType="PLAYER" entityId={player.id} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PlayerAvatar photoUrl={player.photoUrl} displayName={player.displayName} size="lg" />
          <div>
            <h1 className="font-display text-2xl font-bold text-rf-fg">{player.displayName}</h1>
            <p className="text-sm text-rf-fg-muted">
              {player.position ? t(POSITION_KEY[player.position]) : t("unknownPosition")}
              {currentTeam && ` · ${currentTeam.name}`}
              {nationality && ` · ${nationality}`}
            </p>
          </div>
        </div>
        <FavoriteButton entityType="PLAYER" entityId={player.id} />
      </div>

      <section>
        <SectionHeader title={t("statsTitle")} />
        {player.statistics.length === 0 ? (
          <EmptyState icon={BarChart3} title={t("noStats")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-rf-border">
            <table className="w-full text-sm">
              <thead className="bg-rf-bg-elevated text-left text-rf-fg-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("date")}</th>
                  <th className="px-4 py-2 font-medium">{t("minutes")}</th>
                  <th className="px-4 py-2 font-medium">{t("goals")}</th>
                  <th className="px-4 py-2 font-medium">{t("assists")}</th>
                  <th className="px-4 py-2 font-medium">{t("rating")}</th>
                </tr>
              </thead>
              <tbody>
                {player.statistics.map((stat) => (
                  <tr key={stat.id} className="border-t border-rf-border">
                    <td className="px-4 py-2 text-rf-fg-muted">
                      {new Date(stat.fixture.kickoffAt).toLocaleDateString(intlLocale)}
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
