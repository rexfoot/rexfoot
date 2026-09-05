"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { TeamCrest } from "./TeamCrest";
import { cn } from "@/lib/cn";

type TeamConnectSurface = "match_header" | "lineup" | "standings_row";

interface TeamGoogleLinkProps {
  team: { name: string; slug: string; crestUrl?: string | null };
  matchId: string;
  competitionSlug: string;
  surface: TeamConnectSurface;
  size?: "sm" | "md" | "lg";
  layout?: "row" | "column";
  /** Un seul appelant par page doit passer `true` (le domicile de l'en-tête du marqueur) pour éviter plusieurs bulles identiques à l'écran au premier chargement. */
  showFirstUseHint?: boolean;
  className?: string;
}

const HINT_STORAGE_KEY = "rf-team-connect-hint-seen";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * "RexFoot Connect" : un toque sur l'écusson OU le nom (une seule zone
 * tactile, jamais deux comportements séparés) ouvre une recherche Google du
 * nom exact de l'équipe, dans le MÊME onglet — <a> natif, pas de navigation
 * JS, pour que le bouton Précédent restaure RexFoot depuis le bfcache
 * (proposition UX "RexFoot Connect", 2026-09-06). N'ajoute aucun script
 * tiers ni appel réseau : l'URL est construite localement.
 */
export function TeamGoogleLink({
  team,
  matchId,
  competitionSlug,
  surface,
  size = "sm",
  layout = "row",
  showFirstUseHint = false,
  className,
}: TeamGoogleLinkProps) {
  const t = useTranslations("teamConnect");
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    if (!showFirstUseHint) return;
    try {
      // Rendu initial `false` volontaire des deux côtés (SSR + hydratation) pour
      // rester identique au serveur, qui n'a pas accès à localStorage ; on ne
      // peut donc savoir "déjà vu" qu'après montage, d'où le setState ici plutôt
      // qu'un état initial paresseux (qui provoquerait un mismatch d'hydratation).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!window.localStorage.getItem(HINT_STORAGE_KEY)) setHintVisible(true);
    } catch {
      // Stockage indisponible (navigation privée, etc.) : pas de bulle, sans conséquence.
    }
  }, [showFirstUseHint]);

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(team.name)}`;

  function handleClick() {
    try {
      window.localStorage.setItem(HINT_STORAGE_KEY, "1");
    } catch {
      // idem
    }
    setHintVisible(false);
    window.gtag?.("event", "team_connect_click", {
      team_name: team.name,
      team_slug: team.slug,
      surface,
      match_id: matchId,
      competition_slug: competitionSlug,
      transport_type: "beacon",
    });
  }

  return (
    <span className="relative inline-flex">
      <a
        href={searchUrl}
        rel="noopener"
        aria-label={t("ariaLabel", { team: team.name })}
        onClick={handleClick}
        className={cn(
          "group -m-1 inline-flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-rf-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-gold",
          layout === "column" && "flex-col",
          className,
        )}
      >
        <span className="relative inline-flex shrink-0">
          <TeamCrest crestUrl={team.crestUrl} teamName={team.name} size={size} />
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-rf-bg bg-rf-gold text-rf-bg"
          >
            <Search className="h-2 w-2" strokeWidth={3} />
          </span>
        </span>
        <span>{team.name}</span>
      </a>

      {hintVisible && (
        <span
          role="status"
          className="absolute left-1/2 top-full z-10 mt-1.5 w-max max-w-[220px] -translate-x-1/2 text-balance rounded-md border border-rf-border bg-rf-bg-card px-2.5 py-1.5 text-xs text-rf-fg-muted shadow-lg"
        >
          {t("firstUseHint")}
        </span>
      )}
    </span>
  );
}
