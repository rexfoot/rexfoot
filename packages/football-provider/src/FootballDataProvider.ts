import type {
  CompetitionDTO,
  FixtureDetailDTO,
  FixtureDTO,
  FixtureStatusDTO,
  PlayerDTO,
  PlayerStatisticsDTO,
  SeasonDTO,
  StandingDTO,
  TeamDTO,
  TeamStatisticsDTO,
} from "./types";

export interface GetFixturesParams {
  competitionExternalId?: string;
  teamExternalId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: FixtureStatusDTO;
}

export interface GetTeamsParams {
  competitionExternalId: string;
  seasonExternalId: string;
}

export interface GetPlayersParams {
  teamExternalId: string;
  seasonExternalId: string;
}

export interface GetStandingsParams {
  competitionExternalId: string;
  seasonExternalId: string;
}

export interface GetTeamStatisticsParams {
  teamExternalId: string;
  competitionExternalId: string;
  seasonExternalId: string;
}

export interface GetPlayerStatisticsParams {
  playerExternalId: string;
  seasonExternalId: string;
}

/**
 * Contrat unique pour toute source de données football. L'application
 * (worker de synchronisation, routes API internes) ne dépend que de cette
 * interface — jamais d'un SDK ou d'une forme de réponse spécifique à un
 * fournisseur. Changer de fournisseur = écrire une nouvelle classe qui
 * implémente cette interface et mettre à jour `createFootballProvider()`.
 */
export interface FootballDataProvider {
  getCompetitions(params?: { countryCode?: string }): Promise<CompetitionDTO[]>;
  getSeasons(competitionExternalId: string): Promise<SeasonDTO[]>;
  getTeams(params: GetTeamsParams): Promise<TeamDTO[]>;
  getPlayers(params: GetPlayersParams): Promise<PlayerDTO[]>;
  getFixtures(params: GetFixturesParams): Promise<FixtureDTO[]>;
  getLiveScores(): Promise<FixtureDTO[]>;
  getFixtureDetail(fixtureExternalId: string): Promise<FixtureDetailDTO | null>;
  getStandings(params: GetStandingsParams): Promise<StandingDTO[]>;
  getTeamStatistics(params: GetTeamStatisticsParams): Promise<TeamStatisticsDTO | null>;
  getPlayerStatistics(params: GetPlayerStatisticsParams): Promise<PlayerStatisticsDTO[]>;
}
