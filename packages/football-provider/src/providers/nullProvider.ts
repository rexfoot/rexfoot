import type {
  FootballDataProvider,
  GetFixturesParams,
  GetPlayersParams,
  GetPlayerStatisticsParams,
  GetStandingsParams,
  GetTeamsParams,
  GetTeamStatisticsParams,
} from "../FootballDataProvider";
import type {
  CompetitionDTO,
  FixtureDetailDTO,
  FixtureDTO,
  PlayerDTO,
  PlayerStatisticsDTO,
  SeasonDTO,
  StandingDTO,
  TeamDTO,
  TeamStatisticsDTO,
} from "../types";

/**
 * Provider "vide" utilisé tant qu'aucune clé API football n'est configurée.
 * Renvoie systématiquement des listes/valeurs vides plutôt que de lancer une
 * erreur — ça garantit que l'app tourne et affiche des états vides propres
 * au lieu de planter ou d'afficher de fausses données présentées comme réelles.
 */
export class NullFootballProvider implements FootballDataProvider {
  async getCompetitions(): Promise<CompetitionDTO[]> {
    return [];
  }

  async getSeasons(_competitionExternalId: string): Promise<SeasonDTO[]> {
    return [];
  }

  async getTeams(_params: GetTeamsParams): Promise<TeamDTO[]> {
    return [];
  }

  async getPlayers(_params: GetPlayersParams): Promise<PlayerDTO[]> {
    return [];
  }

  async getFixtures(_params: GetFixturesParams): Promise<FixtureDTO[]> {
    return [];
  }

  async getLiveScores(): Promise<FixtureDTO[]> {
    return [];
  }

  async getFixtureDetail(_fixtureExternalId: string): Promise<FixtureDetailDTO | null> {
    return null;
  }

  async getStandings(_params: GetStandingsParams): Promise<StandingDTO[]> {
    return [];
  }

  async getTeamStatistics(_params: GetTeamStatisticsParams): Promise<TeamStatisticsDTO | null> {
    return null;
  }

  async getPlayerStatistics(_params: GetPlayerStatisticsParams): Promise<PlayerStatisticsDTO[]> {
    return [];
  }
}
