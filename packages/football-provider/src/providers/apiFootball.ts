import type {
  FootballDataProvider,
  GetFixturesParams,
  GetPlayersParams,
  GetPlayerStatisticsParams,
  GetStandingsParams,
  GetTeamsParams,
  GetTeamStatisticsParams,
} from "../FootballDataProvider";
import {
  FootballProviderError,
  type CompetitionDTO,
  type FixtureDetailDTO,
  type FixtureDTO,
  type FixtureEventDTO,
  type FixtureStatusDTO,
  type PlayerDTO,
  type PlayerStatisticsDTO,
  type SeasonDTO,
  type StandingDTO,
  type TeamDTO,
  type TeamStatisticsDTO,
} from "../types";

const BASE_URL = "https://v3.football.api-sports.io";

export interface ApiFootballConfig {
  apiKey: string;
  apiHost: string;
}

// Statuts courts renvoyés par l'API-Football (voir "Fixture Status" dans leur doc)
// mappés vers notre enum interne. À vérifier/ajuster contre la doc live une fois
// une vraie clé branchée — cette table couvre les codes documentés publiquement.
const STATUS_MAP: Record<string, FixtureStatusDTO> = {
  TBD: "SCHEDULED",
  NS: "SCHEDULED",
  "1H": "LIVE",
  HT: "HALFTIME",
  "2H": "LIVE",
  ET: "LIVE",
  BT: "HALFTIME",
  P: "LIVE",
  SUSP: "POSTPONED",
  INT: "POSTPONED",
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  PST: "POSTPONED",
  CANC: "CANCELLED",
  ABD: "CANCELLED",
  AWD: "FINISHED",
  WO: "FINISHED",
  LIVE: "LIVE",
};

const EVENT_TYPE_MAP: Record<string, FixtureEventDTO["type"] | undefined> = {
  Goal: "GOAL",
  "Own Goal": "OWN_GOAL",
  Penalty: "PENALTY",
  "Missed Penalty": "MISSED_PENALTY",
  Card: "YELLOW_CARD", // affiné via `detail` dans mapEvent()
  subst: "SUBSTITUTION",
  Var: "VAR",
};

/**
 * Implémentation concrète de FootballDataProvider pour API-Football (RapidAPI).
 * https://www.api-football.com/documentation-v3
 *
 * Ne fait AUCUN cache — c'est le rôle de RedisCachingProvider qui enveloppe
 * cette classe. Toute erreur réseau/HTTP est convertie en FootballProviderError
 * pour ne jamais laisser fuiter une erreur fetch brute vers l'app.
 */
export class ApiFootballProvider implements FootballDataProvider {
  constructor(private readonly config: ApiFootballConfig) {}

  private async request<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(BASE_URL + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "x-rapidapi-key": this.config.apiKey,
          "x-rapidapi-host": this.config.apiHost,
        },
      });
    } catch (cause) {
      throw new FootballProviderError(`Échec réseau vers API-Football (${path})`, cause);
    }

    if (!response.ok) {
      throw new FootballProviderError(
        `API-Football a répondu ${response.status} pour ${path}`,
      );
    }

    const body = (await response.json()) as { response: T; errors?: unknown[] };
    if (body.errors && Array.isArray(body.errors) && body.errors.length > 0) {
      throw new FootballProviderError(
        `API-Football a renvoyé des erreurs pour ${path}: ${JSON.stringify(body.errors)}`,
      );
    }

    return body.response;
  }

  async getCompetitions(params: { countryCode?: string } = {}): Promise<CompetitionDTO[]> {
    const raw = await this.request<ApiFootballLeagueEnvelope[]>("/leagues", {
      code: params.countryCode,
    });
    return raw.map(mapCompetition);
  }

  async getSeasons(competitionExternalId: string): Promise<SeasonDTO[]> {
    const raw = await this.request<ApiFootballLeagueEnvelope[]>("/leagues", {
      id: competitionExternalId,
    });
    const league = raw[0];
    if (!league) return [];
    return league.seasons.map((season) => mapSeason(season, competitionExternalId));
  }

  async getTeams(params: GetTeamsParams): Promise<TeamDTO[]> {
    const raw = await this.request<ApiFootballTeamEnvelope[]>("/teams", {
      league: params.competitionExternalId,
      season: params.seasonExternalId,
    });
    return raw.map((entry) => mapTeam(entry.team, entry.venue));
  }

  async getPlayers(params: GetPlayersParams): Promise<PlayerDTO[]> {
    const raw = await this.request<ApiFootballPlayerEnvelope[]>("/players", {
      team: params.teamExternalId,
      season: params.seasonExternalId,
    });
    return raw.map((entry) => mapPlayer(entry, params.teamExternalId));
  }

  async getFixtures(params: GetFixturesParams): Promise<FixtureDTO[]> {
    const raw = await this.request<ApiFootballFixtureEnvelope[]>("/fixtures", {
      league: params.competitionExternalId,
      team: params.teamExternalId,
      from: params.dateFrom ? formatDate(params.dateFrom) : undefined,
      to: params.dateTo ? formatDate(params.dateTo) : undefined,
    });
    return raw.map(mapFixture);
  }

  async getLiveScores(): Promise<FixtureDTO[]> {
    const raw = await this.request<ApiFootballFixtureEnvelope[]>("/fixtures", {
      live: "all",
    });
    return raw.map(mapFixture);
  }

  async getFixtureDetail(fixtureExternalId: string): Promise<FixtureDetailDTO | null> {
    const raw = await this.request<ApiFootballFixtureEnvelope[]>("/fixtures", {
      id: fixtureExternalId,
    });
    const entry = raw[0];
    if (!entry) return null;
    return {
      ...mapFixture(entry),
      events: (entry.events ?? []).map(mapEvent),
    };
  }

  async getStandings(params: GetStandingsParams): Promise<StandingDTO[]> {
    const raw = await this.request<ApiFootballStandingsEnvelope[]>("/standings", {
      league: params.competitionExternalId,
      season: params.seasonExternalId,
    });
    const groups = raw[0]?.league?.standings ?? [];
    return groups.flatMap((group, index) =>
      group.map((row) => mapStanding(row, groups.length > 1 ? `Group ${index + 1}` : null)),
    );
  }

  async getTeamStatistics(params: GetTeamStatisticsParams): Promise<TeamStatisticsDTO | null> {
    const raw = await this.request<ApiFootballTeamStatsEnvelope | null>("/teams/statistics", {
      team: params.teamExternalId,
      league: params.competitionExternalId,
      season: params.seasonExternalId,
    });
    if (!raw) return null;
    return mapTeamStatistics(raw, params.teamExternalId);
  }

  async getPlayerStatistics(params: GetPlayerStatisticsParams): Promise<PlayerStatisticsDTO[]> {
    const raw = await this.request<ApiFootballPlayerEnvelope[]>("/players", {
      id: params.playerExternalId,
      season: params.seasonExternalId,
    });
    const entry = raw[0];
    if (!entry) return [];
    return (entry.statistics ?? []).map((stat) => mapPlayerStatistics(stat, params.playerExternalId));
  }
}

// ---------------------------------------------------------------------------
// Formes brutes API-Football (partielles — uniquement les champs qu'on lit).
// Doit être vérifié/ajusté contre la doc live une fois RAPIDAPI_KEY configuré.
// ---------------------------------------------------------------------------

interface ApiFootballLeagueEnvelope {
  league: { id: number; name: string; type: string; logo: string | null };
  country: { name: string | null; code: string | null };
  seasons: Array<{ year: number; start: string; end: string; current: boolean }>;
}

interface ApiFootballTeamEnvelope {
  team: {
    id: number;
    name: string;
    code: string | null;
    logo: string | null;
    founded: number | null;
    country: string | null;
  };
  venue: { name: string | null; city: string | null };
}

interface ApiFootballPlayerEnvelope {
  player: {
    id: number;
    firstname: string | null;
    lastname: string | null;
    name: string;
    photo: string | null;
    birth: { date: string | null };
    nationality: string | null;
    height: string | null;
    weight: string | null;
  };
  statistics?: Array<{
    games: { position: string | null; minutes: number | null; rating: string | null };
    goals: { total: number | null; assists: number | null };
    shots: { total: number | null; on: number | null };
    passes: { total: number | null; accuracy: number | null };
    tackles: { total: number | null };
    cards: { yellow: number | null; red: number | null };
    team: { id: number };
  }>;
}

interface ApiFootballFixtureEnvelope {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
    venue: { name: string | null };
    referee: string | null;
  };
  league: { id: number; season: number };
  teams: {
    home: { id: number };
    away: { id: number };
  };
  goals: { home: number | null; away: number | null };
  events?: Array<{
    time: { elapsed: number; extra: number | null };
    team: { id: number };
    player: { id: number | null };
    assist: { id: number | null };
    type: string;
    detail: string;
  }>;
}

interface ApiFootballStandingsEnvelope {
  league: {
    standings: Array<
      Array<{
        team: { id: number };
        rank: number;
        all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
        goalsDiff: number;
        points: number;
        form: string | null;
      }>
    >;
  };
}

interface ApiFootballTeamStatsEnvelope {
  team: { id: number };
  cards: {
    yellow: Record<string, { total: number | null }>;
    red: Record<string, { total: number | null }>;
  };
}

// ---------------------------------------------------------------------------
// Mappers — API-Football brut -> DTO normalisé
// ---------------------------------------------------------------------------

function mapCompetition(raw: ApiFootballLeagueEnvelope): CompetitionDTO {
  return {
    externalId: String(raw.league.id),
    name: raw.league.name,
    type: raw.league.type?.toUpperCase() === "CUP" ? "CUP" : "LEAGUE",
    logoUrl: raw.league.logo,
    countryName: raw.country?.name ?? null,
    countryCode: raw.country?.code ?? null,
  };
}

function mapSeason(
  season: ApiFootballLeagueEnvelope["seasons"][number],
  competitionExternalId: string,
): SeasonDTO {
  return {
    externalId: String(season.year),
    competitionExternalId,
    year: String(season.year),
    startDate: season.start ?? null,
    endDate: season.end ?? null,
    isCurrent: Boolean(season.current),
  };
}

function mapTeam(
  team: ApiFootballTeamEnvelope["team"],
  venue: ApiFootballTeamEnvelope["venue"],
): TeamDTO {
  return {
    externalId: String(team.id),
    name: team.name,
    shortName: team.code,
    crestUrl: team.logo,
    foundedYear: team.founded,
    venueName: venue?.name ?? null,
    venueCity: venue?.city ?? null,
    countryCode: team.country,
  };
}

function mapPlayer(entry: ApiFootballPlayerEnvelope, teamExternalId: string): PlayerDTO {
  const p = entry.player;
  const [firstName, ...lastParts] = (p.name ?? "").split(" ");
  return {
    externalId: String(p.id),
    firstName: p.firstname ?? firstName ?? p.name,
    lastName: p.lastname ?? lastParts.join(" ") ?? "",
    displayName: p.name,
    photoUrl: p.photo,
    dateOfBirth: p.birth?.date ?? null,
    nationality: p.nationality,
    position: mapPosition(entry.statistics?.[0]?.games.position ?? null),
    heightCm: parseCm(p.height),
    weightKg: parseKg(p.weight),
    teamExternalId,
    shirtNumber: null,
  };
}

function mapPosition(raw: string | null): PlayerDTO["position"] {
  switch (raw) {
    case "Goalkeeper":
      return "GOALKEEPER";
    case "Defender":
      return "DEFENDER";
    case "Midfielder":
      return "MIDFIELDER";
    case "Attacker":
      return "FORWARD";
    default:
      return null;
  }
}

function mapFixture(entry: ApiFootballFixtureEnvelope): FixtureDTO {
  return {
    externalId: String(entry.fixture.id),
    competitionExternalId: String(entry.league.id),
    seasonExternalId: String(entry.league.season),
    homeTeamExternalId: String(entry.teams.home.id),
    awayTeamExternalId: String(entry.teams.away.id),
    round: null,
    kickoffAt: entry.fixture.date,
    status: STATUS_MAP[entry.fixture.status.short] ?? "SCHEDULED",
    minute: entry.fixture.status.elapsed,
    homeScore: entry.goals.home,
    awayScore: entry.goals.away,
    venueName: entry.fixture.venue?.name ?? null,
    referee: entry.fixture.referee,
  };
}

function mapEvent(raw: NonNullable<ApiFootballFixtureEnvelope["events"]>[number]): FixtureEventDTO {
  let type = EVENT_TYPE_MAP[raw.type] ?? "VAR";
  if (raw.type === "Card" && raw.detail?.toLowerCase().includes("red")) {
    type = "RED_CARD";
  }
  return {
    type,
    minute: raw.time.elapsed,
    extraMinute: raw.time.extra,
    teamExternalId: String(raw.team.id),
    playerExternalId: raw.player.id !== null ? String(raw.player.id) : null,
    assistPlayerExternalId: raw.assist.id !== null ? String(raw.assist.id) : null,
    relatedPlayerExternalId: null,
    detail: raw.detail ?? null,
  };
}

function mapStanding(
  row: ApiFootballStandingsEnvelope["league"]["standings"][number][number],
  groupName: string | null,
): StandingDTO {
  return {
    teamExternalId: String(row.team.id),
    groupName,
    position: row.rank,
    played: row.all.played,
    won: row.all.win,
    drawn: row.all.draw,
    lost: row.all.lose,
    goalsFor: row.all.goals.for,
    goalsAgainst: row.all.goals.against,
    goalDifference: row.goalsDiff,
    points: row.points,
    form: row.form,
  };
}

function mapTeamStatistics(raw: ApiFootballTeamStatsEnvelope, teamExternalId: string): TeamStatisticsDTO {
  const sumTotals = (obj: Record<string, { total: number | null }>) =>
    Object.values(obj).reduce((acc, v) => acc + (v.total ?? 0), 0);
  return {
    teamExternalId,
    possession: null,
    shotsTotal: null,
    shotsOnTarget: null,
    corners: null,
    fouls: null,
    offsides: null,
    yellowCards: sumTotals(raw.cards.yellow),
    redCards: sumTotals(raw.cards.red),
  };
}

function mapPlayerStatistics(
  stat: NonNullable<ApiFootballPlayerEnvelope["statistics"]>[number],
  playerExternalId: string,
): PlayerStatisticsDTO {
  return {
    playerExternalId,
    teamExternalId: String(stat.team.id),
    minutesPlayed: stat.games.minutes,
    goals: stat.goals.total,
    assists: stat.goals.assists,
    shots: stat.shots.total,
    shotsOnTarget: stat.shots.on,
    passes: stat.passes.total,
    passAccuracy: stat.passes.accuracy,
    tackles: stat.tackles.total,
    rating: stat.games.rating ? Number.parseFloat(stat.games.rating) : null,
    yellowCards: stat.cards.yellow,
    redCards: stat.cards.red,
  };
}

function parseCm(raw: string | null): number | null {
  if (!raw) return null;
  const match = /(\d+)/.exec(raw);
  return match ? Number.parseInt(match[1]!, 10) : null;
}

function parseKg(raw: string | null): number | null {
  if (!raw) return null;
  const match = /(\d+)/.exec(raw);
  return match ? Number.parseInt(match[1]!, 10) : null;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
