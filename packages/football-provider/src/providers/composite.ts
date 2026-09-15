import type { FootballDataProvider, GetCompetitionsParams, GetFixturesParams, GetPlayersParams, GetPlayerStatisticsParams, GetStandingsParams, GetTeamsParams, GetTeamStatisticsParams } from "../FootballDataProvider";
import type { CompetitionDTO, FixtureDetailDTO, FixtureDTO, PlayerDTO, PlayerStatisticsDTO, SeasonDTO, StandingDTO, TeamDTO, TeamStatisticsDTO } from "../types";

/**
 * Provider composite qui délègue à un fournisseur principal (football-data.org)
 * pour la plupart des compétitions, et à un fournisseur secondaire (API-Football)
 * pour celles que le premier ne couvre pas (ex. Coupe de France).
 *
 * Le routage est transparent : getCompetitions essaie le primary d'abord,
 * puis le secondary. Un cache interne enregistre quel fournisseur a résolu
 * chaque compétition (par externalId) pour que les appels subséquents
 * (getSeasons, getTeams, etc.) utilisent le bon fournisseur.
 */
export class CompositeFootballProvider implements FootballDataProvider {
  /**
   * Map externalId → provider qui l'a résolu. Permet de router les appels
   * subséquents (getSeasons, getTeams, getFixtures) vers le bon fournisseur
   * quand un externalId vient de l'un ou l'autre.
   */
  private readonly providerByExternalId = new Map<string, FootballDataProvider>();

  constructor(
    private readonly primary: FootballDataProvider,
    private readonly secondary: FootballDataProvider,
  ) {}

  private resolveProvider(competitionExternalId: string): FootballDataProvider {
    return this.providerByExternalId.get(competitionExternalId) ?? this.primary;
  }

  async getCompetitions(params?: GetCompetitionsParams): Promise<CompetitionDTO[]> {
    // Recherche par ID exact : essaie primary d'abord, secondary si pas trouvé
    // ou si le primary lance une erreur (403, 404, réseau, etc.).
    if (params?.id) {
      try {
        const results = await this.primary.getCompetitions(params);
        if (results.length > 0) {
          this.providerByExternalId.set(params.id, this.primary);
          return results;
        }
      } catch {
        // Primary a échoué (403, 404, etc.) — on continue vers le secondary.
      }
      const secondaryResults = await this.secondary.getCompetitions(params);
      if (secondaryResults.length > 0) {
        this.providerByExternalId.set(params.id, this.secondary);
      }
      return secondaryResults;
    }

    // Autres requêtes (par pays, liste complète) : délègue au primary.
    return this.primary.getCompetitions(params);
  }

  async getSeasons(competitionExternalId: string): Promise<SeasonDTO[]> {
    // Le cache providerByExternalId peut ne pas contenir cet externalId
    // (compétition résolue via un autre chemin, ou cache réinitialisé). On
    // essaie le provider résolu, puis fallback sur l'autre en cas d'erreur.
    const resolved = this.resolveProvider(competitionExternalId);
    const fallback = resolved === this.primary ? this.secondary : this.primary;
    try {
      const results = await resolved.getSeasons(competitionExternalId);
      if (results.length > 0) return results;
      // Résultat vide : on tente le fallback (le provider résolu ne couvre
      // peut-être pas cette compétition).
      return await fallback.getSeasons(competitionExternalId);
    } catch {
      return await fallback.getSeasons(competitionExternalId);
    }
  }

  async getTeams(params: GetTeamsParams): Promise<TeamDTO[]> {
    const resolved = this.resolveProvider(params.competitionExternalId);
    const fallback = resolved === this.primary ? this.secondary : this.primary;
    try {
      const results = await resolved.getTeams(params);
      if (results.length > 0) return results;
      return await fallback.getTeams(params);
    } catch {
      return await fallback.getTeams(params);
    }
  }

  async getPlayers(params: GetPlayersParams): Promise<PlayerDTO[]> {
    // Les players sont résolués par équipe — on ne peut pas déterminer le
    // fournisseur à partir de teamExternalId seul. On délègue au primary
    // par défaut (la plupart des équipes viennent de football-data.org).
    return this.primary.getPlayers(params);
  }

  async getFixtures(params: GetFixturesParams): Promise<FixtureDTO[]> {
    if (params.competitionExternalId) {
      const resolved = this.resolveProvider(params.competitionExternalId);
      const fallback = resolved === this.primary ? this.secondary : this.primary;
      try {
        const results = await resolved.getFixtures(params);
        if (results.length > 0) return results;
        return await fallback.getFixtures(params);
      } catch {
        return await fallback.getFixtures(params);
      }
    }
    return this.primary.getFixtures(params);
  }

  async getLiveScores(): Promise<FixtureDTO[]> {
    // Les live scores viennent toujours du primary (football-data.org).
    return this.primary.getLiveScores();
  }

  async getFixtureDetail(fixtureExternalId: string): Promise<FixtureDetailDTO | null> {
    // Le detail est un match unique — on ne peut pas déduire le fournisseur
    // à partir de son ID seul. On essaie le primary, puis le secondary.
    const detail = await this.primary.getFixtureDetail(fixtureExternalId);
    if (detail) return detail;
    return this.secondary.getFixtureDetail(fixtureExternalId);
  }

  async getStandings(params: GetStandingsParams): Promise<StandingDTO[]> {
    const resolved = this.resolveProvider(params.competitionExternalId);
    const fallback = resolved === this.primary ? this.secondary : this.primary;
    try {
      const results = await resolved.getStandings(params);
      if (results.length > 0) return results;
      return await fallback.getStandings(params);
    } catch {
      return await fallback.getStandings(params);
    }
  }

  async getTeamStatistics(params: GetTeamStatisticsParams): Promise<TeamStatisticsDTO | null> {
    const resolved = this.resolveProvider(params.competitionExternalId);
    const fallback = resolved === this.primary ? this.secondary : this.primary;
    try {
      const result = await resolved.getTeamStatistics(params);
      if (result) return result;
      return await fallback.getTeamStatistics(params);
    } catch {
      return await fallback.getTeamStatistics(params);
    }
  }

  async getPlayerStatistics(params: GetPlayerStatisticsParams): Promise<PlayerStatisticsDTO[]> {
    // Comme getPlayers : délègue au primary par défaut.
    return this.primary.getPlayerStatistics(params);
  }
}
