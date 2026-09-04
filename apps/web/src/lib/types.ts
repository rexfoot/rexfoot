import type { FixtureStatus, PlayerPosition } from "@rexfoot/db";

/** Forme allégée d'un match, utilisée par MatchCard et les pages qui listent des matchs. */
export interface MatchSummary {
  id: string;
  kickoffAt: string;
  status: FixtureStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string; slug: string; crestUrl: string | null };
  awayTeam: { id: string; name: string; slug: string; crestUrl: string | null };
  competition: { name: string; slug: string; logoUrl: string | null };
}

export interface TeamStatisticsSummary {
  teamId: string;
  possession: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  corners: number | null;
  fouls: number | null;
  offsides: number | null;
  yellowCards: number | null;
  redCards: number | null;
  expectedGoals: number | null;
  bigChancesCreated: number | null;
}

export interface LineupPlayer {
  name: string;
  number: number | null;
  position: string | null;
}

export interface LineupSummary {
  teamId: string;
  formation: string | null;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface StandingRow {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string | null;
  team: { name: string; slug: string; crestUrl: string | null };
}

/** Détail complet d'un match — forme JSON renvoyée par /api/matches/[id] (dates sérialisées en ISO string). */
export interface MatchDetail extends MatchSummary {
  round: string | null;
  venueName: string | null;
  referee: string | null;
  teamStatistics: TeamStatisticsSummary[];
  lineups: LineupSummary[];
  standings: StandingRow[];
  homeTeamNextMatch: MatchSummary | null;
  awayTeamNextMatch: MatchSummary | null;
}

export interface NationalityOption {
  name: string;
  flagUrl: string | null;
  playerCount: number;
}

export interface NationalityPlayerEntry {
  player: { id: string; slug: string; displayName: string; photoUrl: string | null; position: PlayerPosition | null };
  team: { name: string; slug: string; crestUrl: string | null };
  opponent: { name: string; slug: string; crestUrl: string | null };
  isHome: boolean;
  match: MatchSummary;
  lineupStatus: "STARTER" | "SUBSTITUTE" | null;
}

/** Forme allégée d'une vidéo, utilisée par VideoCard et les pages /video. */
export interface VideoSummary {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
}
