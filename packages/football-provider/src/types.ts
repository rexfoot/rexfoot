// DTOs normalisés — forme commune que tout FootballDataProvider doit renvoyer,
// indépendamment de la forme brute de son API sous-jacente. Le reste de
// l'application (worker de sync, routes API) ne connaît que ces types.

export type FixtureStatusDTO =
  | "SCHEDULED"
  | "LIVE"
  | "HALFTIME"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

export interface CompetitionDTO {
  externalId: string;
  name: string;
  type: "LEAGUE" | "CUP" | "INTERNATIONAL";
  logoUrl: string | null;
  countryName: string | null;
  countryCode: string | null;
}

export interface SeasonDTO {
  externalId: string;
  competitionExternalId: string;
  year: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface TeamDTO {
  externalId: string;
  name: string;
  shortName: string | null;
  crestUrl: string | null;
  foundedYear: number | null;
  venueName: string | null;
  venueCity: string | null;
  countryCode: string | null;
}

export interface PlayerDTO {
  externalId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photoUrl: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  position: "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD" | null;
  heightCm: number | null;
  weightKg: number | null;
  teamExternalId: string;
  shirtNumber: number | null;
}

export interface FixtureDTO {
  externalId: string;
  competitionExternalId: string;
  seasonExternalId: string;
  homeTeamExternalId: string;
  awayTeamExternalId: string;
  round: string | null;
  kickoffAt: string;
  status: FixtureStatusDTO;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  venueName: string | null;
  referee: string | null;
}

export interface FixtureEventDTO {
  type:
    | "GOAL"
    | "OWN_GOAL"
    | "PENALTY"
    | "MISSED_PENALTY"
    | "YELLOW_CARD"
    | "RED_CARD"
    | "SUBSTITUTION"
    | "VAR";
  minute: number;
  extraMinute: number | null;
  teamExternalId: string;
  playerExternalId: string | null;
  assistPlayerExternalId: string | null;
  relatedPlayerExternalId: string | null;
  detail: string | null;
}

export interface FixtureDetailDTO extends FixtureDTO {
  events: FixtureEventDTO[];
}

export interface StandingDTO {
  teamExternalId: string;
  groupName: string | null;
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
}

export interface TeamStatisticsDTO {
  teamExternalId: string;
  possession: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  corners: number | null;
  fouls: number | null;
  offsides: number | null;
  yellowCards: number | null;
  redCards: number | null;
}

export interface PlayerStatisticsDTO {
  playerExternalId: string;
  teamExternalId: string;
  minutesPlayed: number | null;
  goals: number | null;
  assists: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  passes: number | null;
  passAccuracy: number | null;
  tackles: number | null;
  rating: number | null;
  yellowCards: number | null;
  redCards: number | null;
}

/**
 * Spécifique à API-Football (`/injuries`) — pas dans FootballDataProvider
 * commun : ni football-data.org (plan actuel) ni ESPN n'exposent cette donnée,
 * et Highlightly a son propre modèle. Consommé directement via
 * ApiFootballProvider.getInjuries(), voir syncInjuries.ts.
 */
export interface InjuryDTO {
  playerExternalId: string;
  /** Nécessaire pour résoudre le joueur la première fois (avant que Player.apiFootballId soit mis en cache) — voir syncInjuries.ts. */
  playerName: string;
  teamExternalId: string;
  /** Ex. "Missing Fixture" (suspension) vs blessure réelle — voir mapInjuryType(). */
  type: "INJURY" | "SUSPENSION";
  reason: string | null;
  fixtureExternalId: string | null;
}

export class FootballProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FootballProviderError";
  }
}
