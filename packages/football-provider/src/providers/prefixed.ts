import type {
  FootballDataProvider,
  GetCompetitionsParams,
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
  FixtureEventDTO,
  PlayerDTO,
  PlayerStatisticsDTO,
  SeasonDTO,
  StandingDTO,
  TeamDTO,
  TeamStatisticsDTO,
} from "../types";

/**
 * Décorateur qui namespace tous les IDs externes d'un provider avec un
 * préfixe (ex. "espn:123"). Indispensable dès que deux providers sont
 * mélangés dans le composite : football-data.org et ESPN utilisent tous
 * deux des IDs numériques qui PEUVENT entrer en collision dans nos tables
 * (upsert par provider+externalId). Avec le préfixe, "espn:704732" ne
 * rencontrera jamais "437" de FDO.
 *
 * À la sortie on préfixe, à l'entrée on dépréfixe avant de déléguer.
 */
export class PrefixedFootballProvider implements FootballDataProvider {
  constructor(
    private readonly inner: FootballDataProvider,
    private readonly prefix: string,
  ) {}

  private add(id: string): string {
    return id.startsWith(this.prefix) ? id : `${this.prefix}${id}`;
  }

  private strip(id: string): string {
    return id.startsWith(this.prefix) ? id.slice(this.prefix.length) : id;
  }

  private fixture(f: FixtureDTO): FixtureDTO {
    return {
      ...f,
      externalId: this.add(f.externalId),
      competitionExternalId: this.add(f.competitionExternalId),
      seasonExternalId: this.add(f.seasonExternalId),
      homeTeamExternalId: this.add(f.homeTeamExternalId),
      awayTeamExternalId: this.add(f.awayTeamExternalId),
    };
  }

  private event(e: FixtureEventDTO): FixtureEventDTO {
    return {
      ...e,
      teamExternalId: this.add(e.teamExternalId),
      playerExternalId: e.playerExternalId ? this.add(e.playerExternalId) : null,
      assistPlayerExternalId: e.assistPlayerExternalId ? this.add(e.assistPlayerExternalId) : null,
      relatedPlayerExternalId: e.relatedPlayerExternalId ? this.add(e.relatedPlayerExternalId) : null,
    };
  }

  async getCompetitions(params?: GetCompetitionsParams): Promise<CompetitionDTO[]> {
    const list = await this.inner.getCompetitions(
      params?.id ? { ...params, id: this.strip(params.id) } : params,
    );
    return list.map((c) => ({ ...c, externalId: this.add(c.externalId) }));
  }

  async getSeasons(competitionExternalId: string): Promise<SeasonDTO[]> {
    const list = await this.inner.getSeasons(this.strip(competitionExternalId));
    return list.map((s) => ({
      ...s,
      externalId: this.add(s.externalId),
      competitionExternalId: this.add(s.competitionExternalId),
    }));
  }

  async getTeams(params: GetTeamsParams): Promise<TeamDTO[]> {
    const list = await this.inner.getTeams({
      ...params,
      competitionExternalId: this.strip(params.competitionExternalId),
      seasonExternalId: this.strip(params.seasonExternalId),
    });
    return list.map((t) => ({ ...t, externalId: this.add(t.externalId) }));
  }

  async getPlayers(params: GetPlayersParams): Promise<PlayerDTO[]> {
    const list = await this.inner.getPlayers({
      ...params,
      teamExternalId: this.strip(params.teamExternalId),
      seasonExternalId: this.strip(params.seasonExternalId),
    });
    return list.map((p) => ({ ...p, externalId: this.add(p.externalId) }));
  }

  async getFixtures(params: GetFixturesParams): Promise<FixtureDTO[]> {
    const list = await this.inner.getFixtures({
      ...params,
      competitionExternalId: params.competitionExternalId ? this.strip(params.competitionExternalId) : undefined,
      teamExternalId: params.teamExternalId ? this.strip(params.teamExternalId) : undefined,
    });
    return list.map((f) => this.fixture(f));
  }

  async getLiveScores(): Promise<FixtureDTO[]> {
    const list = await this.inner.getLiveScores();
    return list.map((f) => this.fixture(f));
  }

  async getFixtureDetail(fixtureExternalId: string): Promise<FixtureDetailDTO | null> {
    const detail = await this.inner.getFixtureDetail(this.strip(fixtureExternalId));
    if (!detail) return null;
    return { ...this.fixture(detail), events: detail.events.map((e) => this.event(e)) };
  }

  async getStandings(params: GetStandingsParams): Promise<StandingDTO[]> {
    const list = await this.inner.getStandings({
      ...params,
      competitionExternalId: this.strip(params.competitionExternalId),
      seasonExternalId: this.strip(params.seasonExternalId),
    });
    return list.map((s) => ({ ...s, teamExternalId: this.add(s.teamExternalId) }));
  }

  async getTeamStatistics(params: GetTeamStatisticsParams): Promise<TeamStatisticsDTO | null> {
    const stats = await this.inner.getTeamStatistics({
      ...params,
      teamExternalId: this.strip(params.teamExternalId),
      competitionExternalId: this.strip(params.competitionExternalId),
      seasonExternalId: this.strip(params.seasonExternalId),
    });
    return stats ? { ...stats, teamExternalId: this.add(stats.teamExternalId) } : null;
  }

  async getPlayerStatistics(params: GetPlayerStatisticsParams): Promise<PlayerStatisticsDTO[]> {
    const list = await this.inner.getPlayerStatistics({
      ...params,
      playerExternalId: this.strip(params.playerExternalId),
      seasonExternalId: this.strip(params.seasonExternalId),
    });
    return list.map((s) => ({
      ...s,
      playerExternalId: this.add(s.playerExternalId),
      teamExternalId: this.add(s.teamExternalId),
    }));
  }
}
