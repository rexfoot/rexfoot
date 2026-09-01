import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Shield, Users, Trophy, User as UserIcon, type LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPublicProfile } from "@/lib/data/public-profile";
import { TeamCrest } from "@/components/TeamCrest";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { EmptyState } from "@/components/EmptyState";
import { toIntlLocale } from "@/lib/intl-locale";
import { buildAlternates } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [profile, t, locale] = await Promise.all([getPublicProfile(id), getTranslations("profile"), getLocale()]);
  if (!profile) return {};
  return {
    title: t("metaTitle", { name: profile.displayName }),
    alternates: buildAlternates(`/u/${id}`, locale),
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [profile, t, locale] = await Promise.all([getPublicProfile(id), getTranslations("profile"), getLocale()]);
  if (!profile) notFound();

  const { teams, players, competitions } = profile.favorites;
  const hasFavorites = teams.length > 0 || players.length > 0 || competitions.length > 0;
  const memberSince = new Intl.DateTimeFormat(toIntlLocale(locale), { month: "long", year: "numeric" }).format(
    profile.createdAt,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div className="flex items-center gap-4">
        <PlayerAvatar photoUrl={profile.avatarUrl} displayName={profile.displayName} size="lg" />
        <div>
          <h1 className="font-display text-2xl font-bold text-rf-fg">{profile.displayName}</h1>
          <p className="text-sm text-rf-fg-muted">{t("memberSince", { date: memberSince })}</p>
        </div>
      </div>

      <section className="space-y-5">
        <h2 className="font-display text-lg font-bold text-rf-fg">{t("favorites")}</h2>

        {!hasFavorites ? (
          <EmptyState icon={UserIcon} title={t("noFavorites")} />
        ) : (
          <div className="space-y-6">
            {teams.length > 0 && (
              <ProfileSection icon={Shield} title={t("clubs")}>
                {teams.map((team) => (
                  <ProfileRow
                    key={team.id}
                    href={`/teams/${team.slug}`}
                    name={team.name}
                    visual={<TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="sm" />}
                  />
                ))}
              </ProfileSection>
            )}

            {players.length > 0 && (
              <ProfileSection icon={Users} title={t("players")}>
                {players.map((player) => (
                  <ProfileRow
                    key={player.id}
                    href={`/players/${player.slug}`}
                    name={player.displayName}
                    visual={<PlayerAvatar photoUrl={player.photoUrl} displayName={player.displayName} size="sm" />}
                  />
                ))}
              </ProfileSection>
            )}

            {competitions.length > 0 && (
              <ProfileSection icon={Trophy} title={t("competitions")}>
                {competitions.map((competition) => (
                  <ProfileRow
                    key={competition.id}
                    href={`/competitions/${competition.slug}`}
                    name={competition.name}
                    visual={<Trophy size={20} className="text-rf-fg-subtle" />}
                  />
                ))}
              </ProfileSection>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rf-fg-muted">
        <Icon size={16} />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ProfileRow({ href, name, visual }: { href: string; name: string; visual: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-rf-border bg-rf-bg-card p-3 transition-colors hover:border-rf-gold/40"
    >
      {visual}
      <span className="truncate font-medium text-rf-fg">{name}</span>
    </Link>
  );
}
