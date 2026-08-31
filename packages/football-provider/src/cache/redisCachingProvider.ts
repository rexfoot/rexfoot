import type { Redis } from "ioredis";
import { CACHE_TTL_SECONDS } from "@rexfoot/config";
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
  PlayerDTO,
  PlayerStatisticsDTO,
  SeasonDTO,
  StandingDTO,
  TeamDTO,
  TeamStatisticsDTO,
} from "../types";

const PREFIX = "football";

/**
 * Décorateur cache-aside : enveloppe n'importe quel FootballDataProvider et
 * met ses réponses en cache dans Redis pour éviter de payer/consommer du quota
 * API à chaque requête. Le direct (getLiveScores, matchs LIVE) a un TTL très
 * court pour rester frais malgré le cache ; les données statiques (équipes,
 * joueurs, compétitions) ont un TTL long.
 */
export class RedisCachingProvider implements FootballDataProvider {
  constructor(
    private readonly inner: FootballDataProvider,
    private readonly redis: Redis,
  ) {}

  private async cached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cacheKey = `${PREFIX}:${key}`;
    const hit = await this.redis.get(cacheKey);
    if (hit !== null) {
      return JSON.parse(hit) as T;
    }
    const value = await fetcher();
    await this.redis.set(cacheKey, JSON.stringify(value), "EX", ttlSeconds);
    return value;
  }

  async getCompetitions(params: GetCompetitionsParams = {}): Promise<CompetitionDTO[]> {
    return this.cached(
      `competitions:${params.id ?? "-"}:${params.countryCode ?? "all"}`,
      CACHE_TTL_SECONDS.staticEntities,
      () => this.inner.getCompetitions(params),
    );
  }

  async getSeasons(competitionExternalId: string): Promise<SeasonDTO[]> {
    return this.cached(
      `seasons:${competitionExternalId}`,
      CACHE_TTL_SECONDS.staticEntities,
      () => this.inner.getSeasons(competitionExternalId),
    );
  }

  async getTeams(params: GetTeamsParams): Promise<TeamDTO[]> {
    return this.cached(
      `teams:${params.competitionExternalId}:${params.seasonExternalId}`,
      CACHE_TTL_SECONDS.staticEntities,
      () => this.inner.getTeams(params),
    );
  }

  async getPlayers(params: GetPlayersParams): Promise<PlayerDTO[]> {
    return this.cached(
      `players:${params.teamExternalId}:${params.seasonExternalId}`,
      CACHE_TTL_SECONDS.staticEntities,
      () => this.inner.getPlayers(params),
    );
  }

  async getFixtures(params: GetFixturesParams): Promise<FixtureDTO[]> {
    const key = `fixtures:${params.competitionExternalId ?? "-"}:${params.teamExternalId ?? "-"}:${params.dateFrom?.toISOString() ?? "-"}:${params.dateTo?.toISOString() ?? "-"}:${params.status ?? "-"}`;
    return this.cached(key, CACHE_TTL_SECONDS.fixturesShortTerm, () => this.inner.getFixtures(params));
  }

  async getLiveScores(): Promise<FixtureDTO[]> {
    return this.cached("live-scores", CACHE_TTL_SECONDS.live, () => this.inner.getLiveScores());
  }

  async getFixtureDetail(fixtureExternalId: string): Promise<FixtureDetailDTO | null> {
    return this.cached(
      `fixture-detail:${fixtureExternalId}`,
      CACHE_TTL_SECONDS.live,
      () => this.inner.getFixtureDetail(fixtureExternalId),
    );
  }

  async getStandings(params: GetStandingsParams): Promise<StandingDTO[]> {
    return this.cached(
      `standings:${params.competitionExternalId}:${params.seasonExternalId}`,
      CACHE_TTL_SECONDS.standings,
      () => this.inner.getStandings(params),
    );
  }

  async getTeamStatistics(params: GetTeamStatisticsParams): Promise<TeamStatisticsDTO | null> {
    return this.cached(
      `team-stats:${params.teamExternalId}:${params.competitionExternalId}:${params.seasonExternalId}`,
      CACHE_TTL_SECONDS.fixturesShortTerm,
      () => this.inner.getTeamStatistics(params),
    );
  }

  async getPlayerStatistics(params: GetPlayerStatisticsParams): Promise<PlayerStatisticsDTO[]> {
    return this.cached(
      `player-stats:${params.playerExternalId}:${params.seasonExternalId}`,
      CACHE_TTL_SECONDS.fixturesShortTerm,
      () => this.inner.getPlayerStatistics(params),
    );
  }
}
