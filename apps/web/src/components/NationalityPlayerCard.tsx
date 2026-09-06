"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PlayerAvatar } from "./PlayerAvatar";
import { TeamCrest } from "./TeamCrest";
import { CompetitionBadge } from "./CompetitionBadge";
import { toIntlLocale } from "@/lib/intl-locale";
import { cn } from "@/lib/cn";
import type { NationalityPlayerEntry } from "@/lib/types";

// Fuseau fixe : voir le commentaire equivalent dans MatchCard.tsx (evite un
// mismatch d'hydratation serveur/navigateur sur l'heure affichee).
function formatKickoff(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

function MatchStatus({ entry }: { entry: NationalityPlayerEntry }) {
  const t = useTranslations("matches");
  const locale = useLocale();
  const { status, minute } = entry.match;

  if (status === "LIVE" || status === "HALFTIME") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rf-live/15 px-2 py-0.5 text-xs font-bold text-rf-live">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rf-live" />
        {status === "HALFTIME" ? t("halftime") : `${minute ?? 0}'`}
      </span>
    );
  }
  if (status === "FINISHED") {
    return <span className="text-xs font-semibold text-rf-fg-subtle">{t("finished")}</span>;
  }
  return <span className="text-xs font-semibold text-rf-fg-muted">{formatKickoff(entry.match.kickoffAt, toIntlLocale(locale))}</span>;
}

export function NationalityPlayerCard({ entry }: { entry: NationalityPlayerEntry }) {
  const t = useTranslations("nationality");
  const hasScore = entry.match.homeScore !== null && entry.match.awayScore !== null;

  return (
    <Link
      href={`/players/${entry.player.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-rf-border bg-rf-bg-card p-4 transition-colors hover:border-rf-gold/40"
    >
      <PlayerAvatar photoUrl={entry.player.photoUrl} displayName={entry.player.displayName} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-sm font-bold text-rf-fg">{entry.player.displayName}</span>
          {entry.lineupStatus && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                entry.lineupStatus === "STARTER" ? "bg-rf-success/15 text-rf-success" : "bg-rf-gold/15 text-rf-gold",
              )}
            >
              {entry.lineupStatus === "STARTER" ? t("starter") : t("substitute")}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-rf-fg-muted">
          <TeamCrest crestUrl={entry.team.crestUrl} teamName={entry.team.name} size="sm" />
          <span className="truncate">{entry.team.name}</span>
          {hasScore ? (
            <span className="shrink-0 font-semibold text-rf-fg">
              {entry.isHome ? entry.match.homeScore : entry.match.awayScore}–{entry.isHome ? entry.match.awayScore : entry.match.homeScore}
            </span>
          ) : (
            <span className="shrink-0">vs</span>
          )}
          <TeamCrest crestUrl={entry.opponent.crestUrl} teamName={entry.opponent.name} size="sm" />
          <span className="truncate">{entry.opponent.name}</span>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <CompetitionBadge logoUrl={entry.match.competition.logoUrl} name={entry.match.competition.name} />
          <MatchStatus entry={entry} />
        </div>
      </div>
    </Link>
  );
}
