import type { ReactNode } from "react";
import { Heart, Shield, Users, Trophy, type LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import type { FavoriteEntityType } from "@rexfoot/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getFavoritesForUser } from "@/lib/data/favorites";
import { TeamCrest } from "@/components/TeamCrest";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { FavoriteButton } from "@/components/FavoriteButton";
import { EmptyState } from "@/components/EmptyState";
import { PublicLogoutButton } from "@/components/PublicLogoutButton";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const t = await getTranslations("account");
  const user = await getCurrentUser();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login?next=/account", locale });
    return;
  }

  const { teams, players, competitions } = await getFavoritesForUser(user.id);
  const hasFavorites = teams.length > 0 || players.length > 0 || competitions.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-rf-fg">{user.displayName}</h1>
          <p className="text-sm text-rf-fg-muted">{user.email}</p>
        </div>
        <PublicLogoutButton />
      </div>

      <section className="space-y-5">
        <h2 className="font-display text-lg font-bold text-rf-fg">{t("myFavorites")}</h2>

        {!hasFavorites ? (
          <EmptyState icon={Heart} title={t("noFavorites")} description={t("noFavoritesDescription")} />
        ) : (
          <div className="space-y-6">
            {teams.length > 0 && (
              <FavoriteSection icon={Shield} title={t("clubs")}>
                {teams.map((team) => (
                  <FavoriteRow
                    key={team.id}
                    href={`/teams/${team.slug}`}
                    name={team.name}
                    visual={<TeamCrest crestUrl={team.crestUrl} teamName={team.name} size="sm" />}
                    entityType="TEAM"
                    entityId={team.id}
                  />
                ))}
              </FavoriteSection>
            )}

            {players.length > 0 && (
              <FavoriteSection icon={Users} title={t("players")}>
                {players.map((player) => (
                  <FavoriteRow
                    key={player.id}
                    href={`/players/${player.slug}`}
                    name={player.displayName}
                    visual={<PlayerAvatar photoUrl={player.photoUrl} displayName={player.displayName} size="sm" />}
                    entityType="PLAYER"
                    entityId={player.id}
                  />
                ))}
              </FavoriteSection>
            )}

            {competitions.length > 0 && (
              <FavoriteSection icon={Trophy} title={t("competitions")}>
                {competitions.map((competition) => (
                  <FavoriteRow
                    key={competition.id}
                    href={`/competitions/${competition.slug}`}
                    name={competition.name}
                    visual={<Trophy size={20} className="text-rf-fg-subtle" />}
                    entityType="COMPETITION"
                    entityId={competition.id}
                  />
                ))}
              </FavoriteSection>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FavoriteSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
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

function FavoriteRow({
  href,
  name,
  visual,
  entityType,
  entityId,
}: {
  href: string;
  name: string;
  visual: ReactNode;
  entityType: FavoriteEntityType;
  entityId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-rf-border bg-rf-bg-card p-3">
      <Link href={href} className="flex min-w-0 items-center gap-3">
        {visual}
        <span className="truncate font-medium text-rf-fg">{name}</span>
      </Link>
      <FavoriteButton entityType={entityType} entityId={entityId} />
    </div>
  );
}
