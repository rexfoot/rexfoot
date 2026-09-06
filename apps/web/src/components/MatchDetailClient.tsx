"use client";

import { useEffect, useRef, useState } from "react";
import { ListChecks, Goal } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { TeamGoogleLink } from "./TeamGoogleLink";
import { CompetitionBadge } from "./CompetitionBadge";
import { EmptyState } from "./EmptyState";
import { MatchCard } from "./MatchCard";
import { FormBadge } from "./FormBadge";
import { FormationPitch, SubstitutesList, filterActiveSubstitutes } from "./FormationPitch";
import { GoalCelebration } from "./GoalCelebration";
import { useMatchDetail } from "@/hooks/useMatchDetail";
import { toIntlLocale } from "@/lib/intl-locale";
import { bestKnownMinute } from "@/lib/match-minute";
import { cn } from "@/lib/cn";
import type { MatchDetail, MatchEventSummary, MatchSummary } from "@/lib/types";

type QuickTab = "composition" | "standings" | "nextMatch";

const GOAL_EVENT_TYPES: ReadonlySet<MatchEventSummary["type"]> = new Set(["GOAL", "PENALTY", "OWN_GOAL"]);

function useStatusLabel(match: MatchDetail): string {
  const t = useTranslations("matches");
  const locale = useLocale();
  const knownMinute = bestKnownMinute(match.minute, match.events, match.kickoffAt);

  switch (match.status) {
    case "LIVE":
      return knownMinute !== null ? `${knownMinute}' — ${t("live")}` : t("live");
    case "HALFTIME":
      return t("halftime");
    case "FINISHED":
      return t("finished");
    case "POSTPONED":
      return t("postponed");
    case "CANCELLED":
      return t("cancelled");
    default:
      // Fuseau fixe : voir le commentaire equivalent dans MatchCard.tsx (evite
      // un mismatch d'hydratation serveur/navigateur sur l'heure affichee).
      return new Date(match.kickoffAt).toLocaleString(toIntlLocale(locale), {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      });
  }
}

export function MatchDetailClient({ matchId, initialMatch }: { matchId: string; initialMatch: MatchDetail }) {
  const t = useTranslations("matches");
  const match = useMatchDetail(matchId, initialMatch);
  const statusLabel = useStatusLabel(match);
  const isLive = match.status === "LIVE" || match.status === "HALFTIME";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const goal = useGoalCelebration(match);

  return (
    <div className="space-y-8">
      <GoalCelebration trigger={goal.trigger} label={goal.label} />

      <div className="rounded-2xl border border-rf-border bg-rf-bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <CompetitionBadge logoUrl={match.competition.logoUrl} name={match.competition.name} />
          {match.round && <span className="text-xs text-rf-fg-subtle">{match.round}</span>}
        </div>

        <div className="grid grid-cols-3 items-center gap-4">
          <TeamColumn
            team={match.homeTeam}
            standing={findStanding(match.standings, match.homeTeam.slug)}
            matchId={match.id}
            competitionSlug={match.competition.slug}
            showFirstUseHint
          />
          <div className="text-center">
            {hasScore ? (
              <p className="font-display text-4xl font-extrabold text-rf-fg">
                {match.homeScore} <span className="text-rf-fg-subtle">–</span> {match.awayScore}
              </p>
            ) : (
              <p className="font-display text-2xl font-bold text-rf-fg-muted">{t("vs")}</p>
            )}
            <p className={`mt-2 text-sm font-semibold ${isLive ? "text-rf-live" : "text-rf-fg-muted"}`}>{statusLabel}</p>
          </div>
          <TeamColumn
            team={match.awayTeam}
            standing={findStanding(match.standings, match.awayTeam.slug)}
            matchId={match.id}
            competitionSlug={match.competition.slug}
          />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-rf-border pt-5">
          <MatchScorers events={match.events} teamId={match.homeTeam.id} align="start" />
          <div />
          <MatchScorers events={match.events} teamId={match.awayTeam.id} align="end" />
        </div>
      </div>

      <QuickTabs match={match} />
    </div>
  );
}

/**
 * Détecte une hausse du score total (nouveau but) entre deux rendus et
 * déclenche l'animation GoalCelebration — jamais au tout premier rendu
 * (prevTotal démarre à `null`), sinon un match déjà à 2-1 à l'ouverture de
 * la page fêterait un but qui n'a pas eu lieu pendant que l'utilisateur
 * regardait.
 */
function useGoalCelebration(match: MatchDetail): { trigger: number; label: string } {
  const prevTotalRef = useRef<number | null>(null);
  const [state, setState] = useState<{ trigger: number; label: string }>({ trigger: 0, label: "" });

  useEffect(() => {
    if (match.homeScore === null || match.awayScore === null) return;
    const total = match.homeScore + match.awayScore;

    if (prevTotalRef.current !== null && total > prevTotalRef.current) {
      const latestGoal = [...match.events]
        .filter((e) => GOAL_EVENT_TYPES.has(e.type))
        .sort((a, b) => b.minute - a.minute)[0];
      const scorerTeam = latestGoal?.teamId === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name;
      const label = latestGoal?.detail ? `${latestGoal.detail} — ${scorerTeam}` : scorerTeam;
      setState((s) => ({ trigger: s.trigger + 1, label }));
    }
    prevTotalRef.current = total;
  }, [match.homeScore, match.awayScore, match.events, match.homeTeam.id, match.homeTeam.name, match.awayTeam.name]);

  return state;
}

/**
 * Réplique en réduit le bloc "match" de Google (composition/classement/prochain
 * match dans le même bloc, un clic change juste le panneau affiché — jamais de
 * navigation). Remplace la section Événements (retirée) juste sous le score ;
 * Statistiques reste une section à part, toujours visible, plus bas.
 */
function QuickTabs({ match }: { match: MatchDetail }) {
  const t = useTranslations("matches");
  const [tab, setTab] = useState<QuickTab>("composition");

  const tabs: Array<{ id: QuickTab; label: string }> = [
    { id: "composition", label: t("composition") },
    { id: "standings", label: t("standingsTab") },
    { id: "nextMatch", label: t("nextMatch") },
  ];

  return (
    <section>
      <div className="mb-3 flex gap-2 overflow-x-auto rounded-full border border-rf-border bg-rf-bg-card p-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === id ? "bg-rf-gold text-rf-bg" : "text-rf-fg-muted hover:text-rf-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "composition" && <CompositionPanel match={match} />}
      {tab === "standings" && <StandingsPanel match={match} />}
      {tab === "nextMatch" && <NextMatchPanel match={match} />}
    </section>
  );
}

/** Style Sofascore : un seul pitch partagé (extérieur en haut, domicile en bas), demandé par Hicham le 2026-09-05. */
function CompositionPanel({ match }: { match: MatchDetail }) {
  const t = useTranslations("matches");
  const rawHome = match.lineups.find((l) => l.teamId === match.homeTeam.id);
  const rawAway = match.lineups.find((l) => l.teamId === match.awayTeam.id);

  if (!rawHome || !rawAway) {
    return <EmptyState icon={ListChecks} title={t("noLineups")} />;
  }

  const home = filterActiveSubstitutes(rawHome, match.events);
  const away = filterActiveSubstitutes(rawAway, match.events);

  return (
    <div className="space-y-3">
      <TeamFormationHeader team={match.awayTeam} formation={away.formation} matchId={match.id} competitionSlug={match.competition.slug} />
      <FormationPitch home={home} away={away} />
      <TeamFormationHeader team={match.homeTeam} formation={home.formation} matchId={match.id} competitionSlug={match.competition.slug} />

      <div className="grid grid-cols-1 gap-4 border-t border-rf-border pt-4 sm:grid-cols-2">
        <SubstitutesList lineup={home} side="home" />
        <SubstitutesList lineup={away} side="away" />
      </div>
    </div>
  );
}

function TeamFormationHeader({
  team,
  formation,
  matchId,
  competitionSlug,
}: {
  team: MatchDetail["homeTeam"];
  formation: string | null;
  matchId: string;
  competitionSlug: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-rf-fg">
      <TeamGoogleLink team={team} matchId={matchId} competitionSlug={competitionSlug} surface="lineup" size="sm" />
      {formation && <span className="font-normal text-rf-fg-subtle">({formation})</span>}
    </div>
  );
}

function StandingsPanel({ match }: { match: MatchDetail }) {
  const t = useTranslations("matches");
  const s = useTranslations("standings");

  if (match.standings.length === 0) {
    return <EmptyState icon={ListChecks} title={t("noStandingsForMatch")} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-rf-border">
      <table className="w-full text-sm">
        <thead className="bg-rf-bg-elevated text-left text-rf-fg-muted">
          <tr>
            <th className="px-3 py-2 font-medium">{s("position")}</th>
            <th className="px-3 py-2 font-medium">{s("team")}</th>
            <th className="px-3 py-2 text-center font-medium">{s("played")}</th>
            <th className="px-3 py-2 text-center font-medium">{s("goalDifference")}</th>
            <th className="px-3 py-2 text-center font-medium">{s("points")}</th>
            <th className="px-3 py-2 text-center font-medium">{s("form")}</th>
          </tr>
        </thead>
        <tbody className="[font-variant-numeric:tabular-nums]">
          {match.standings.map((row) => {
            const isMatchTeam = row.team.slug === match.homeTeam.slug || row.team.slug === match.awayTeam.slug;
            return (
              <tr
                key={row.team.slug}
                className={cn("border-t border-rf-border", isMatchTeam && "bg-rf-gold/10")}
              >
                <td className="px-3 py-2 text-rf-fg-muted">{row.position}</td>
                <td className="px-3 py-2">
                  <TeamGoogleLink
                    team={row.team}
                    matchId={match.id}
                    competitionSlug={match.competition.slug}
                    surface="standings_row"
                    size="sm"
                    className="font-medium text-rf-fg"
                  />
                </td>
                <td className="px-3 py-2 text-center text-rf-fg-muted">{row.played}</td>
                <td className="px-3 py-2 text-center text-rf-fg-muted">{row.goalDifference}</td>
                <td className="px-3 py-2 text-center font-bold text-rf-fg">{row.points}</td>
                <td className="px-3 py-2">
                  <FormBadge form={row.form} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NextMatchPanel({ match }: { match: MatchDetail }) {
  const t = useTranslations("matches");
  const entries: Array<{ teamName: string; next: MatchSummary | null }> = [
    { teamName: match.homeTeam.name, next: match.homeTeamNextMatch },
    { teamName: match.awayTeam.name, next: match.awayTeamNextMatch },
  ];

  if (entries.every((e) => !e.next)) {
    return <EmptyState icon={ListChecks} title={t("noNextMatch")} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {entries.map(({ teamName, next }) => (
        <div key={teamName}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rf-fg-subtle">{teamName}</p>
          {next ? <MatchCard match={next} /> : <EmptyState icon={ListChecks} title={t("noNextMatch")} />}
        </div>
      ))}
    </div>
  );
}

function formatEventMinute(minute: number, extraMinute: number | null): string {
  return extraMinute ? `${minute}+${extraMinute}'` : `${minute}'`;
}

/**
 * Remplace le bloc "Partager" sous le score par les buteurs (demandé par
 * Hicham le 2026-09-05) — un but par ligne, trié par minute, aligné du côté
 * de l'équipe qui a marqué (colonnes domicile/extérieur de la grille du
 * score juste au-dessus).
 */
function MatchScorers({
  events,
  teamId,
  align,
}: {
  events: MatchEventSummary[];
  teamId: string;
  align: "start" | "end";
}) {
  const t = useTranslations("matches");
  const scorers = events
    .filter((e) => e.teamId === teamId && GOAL_EVENT_TYPES.has(e.type) && e.detail)
    .sort((a, b) => a.minute - b.minute);

  if (scorers.length === 0) return null;

  return (
    <ul className={cn("space-y-1", align === "end" ? "text-end" : "text-start")}>
      {scorers.map((event) => (
        <li
          key={event.id}
          className={cn(
            "flex items-center gap-1.5 text-xs text-rf-fg-subtle",
            align === "end" && "flex-row-reverse",
          )}
        >
          <Goal size={12} className={cn("shrink-0", event.type === "OWN_GOAL" ? "text-rf-live" : "text-rf-gold")} />
          <span className="truncate">
            {event.detail}
            {event.type === "OWN_GOAL" ? ` (${t("ownGoal")})` : ""}
          </span>
          <span className="shrink-0 text-rf-fg-subtle/70">{formatEventMinute(event.minute, event.extraMinute)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Ligne de classement de l'équipe dans le classement affiché sous l'onglet Classement — même source, pas de calcul séparé. */
function findStanding(standings: MatchDetail["standings"], teamSlug: string): MatchDetail["standings"][number] | null {
  return standings.find((row) => row.team.slug === teamSlug) ?? null;
}

/**
 * Flèche montée/descente sous le nom de l'équipe (demandé par Hicham le
 * 2026-09-05) — compare à `previousPosition` (position au sync précédent,
 * voir Standing.previousPosition/syncStandings.ts) : un chiffre de position
 * PLUS PETIT = mieux classé, donc "monte". Rien affiché si on n'a encore
 * aucun historique (previousPosition null) ou si la position n'a pas bougé.
 */
function PositionBadge({ standing }: { standing: MatchDetail["standings"][number] | null }) {
  if (!standing) return null;
  const { position, previousPosition } = standing;

  if (previousPosition === null || previousPosition === position) {
    return <span className="text-xs font-semibold text-rf-fg-subtle">#{position}</span>;
  }

  const isRising = position < previousPosition;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold",
        isRising ? "text-green-500" : "text-red-500",
      )}
    >
      #{position}
      <span aria-hidden>{isRising ? "▲" : "▼"}</span>
    </span>
  );
}

function TeamColumn({
  team,
  standing,
  matchId,
  competitionSlug,
  showFirstUseHint,
}: {
  team: { name: string; slug: string; crestUrl: string | null };
  standing: MatchDetail["standings"][number] | null;
  matchId: string;
  competitionSlug: string;
  showFirstUseHint?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamGoogleLink
        team={team}
        matchId={matchId}
        competitionSlug={competitionSlug}
        surface="match_header"
        size="lg"
        layout="column"
        showFirstUseHint={showFirstUseHint}
        className="text-sm font-medium text-rf-fg"
      />
      <PositionBadge standing={standing} />
    </div>
  );
}
