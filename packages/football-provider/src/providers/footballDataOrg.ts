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
import {
  FootballProviderError,
  type CompetitionDTO,
  type FixtureDetailDTO,
  type FixtureDTO,
  type PlayerDTO,
  type PlayerStatisticsDTO,
  type SeasonDTO,
  type StandingDTO,
  type TeamDTO,
  type TeamStatisticsDTO,
} from "../types";

const BASE_URL = "https://api.football-data.org/v4";

export interface FootballDataOrgConfig {
  apiKey: string;
}

// Plan "Free w/ Livescores" (passé de gratuit a 12E/mois le 2026-09-05,
// justement pour lever le retard delibere du plan gratuit sur les scores) :
// 20 requetes/minute, toujours aucun plafond quotidien. Marge de securite
// gardee a 80% du quota documente (16 au lieu de 20), meme ratio qu'avant.
const MAX_REQUESTS_PER_WINDOW = 16;
const WINDOW_MS = 60_000;

const STATUS_MAP: Record<string, FixtureDTO["status"]> = {
  SCHEDULED: "SCHEDULED",
  TIMED: "SCHEDULED",
  IN_PLAY: "LIVE",
  PAUSED: "HALFTIME",
  FINISHED: "FINISHED",
  AWARDED: "FINISHED",
  POSTPONED: "POSTPONED",
  SUSPENDED: "POSTPONED",
  CANCELLED: "CANCELLED",
};

/**
 * Implémentation FootballDataProvider pour football-data.org (plan gratuit).
 * https://docs.football-data.org/general/v4/
 *
 * Limites réelles de ce plan, assumées explicitement plutôt que masquées :
 * pas d'événements de match (buts/cartons minute par minute), pas de photo
 * de joueur ni de statistiques joueur/équipe, pas de Ligue Europa. Chaque
 * méthode concernée renvoie une liste vide / `null` plutôt que d'inventer
 * une valeur — voir les commentaires méthode par méthode.
 */
export class FootballDataOrgProvider implements FootballDataProvider {
  private requestTimestamps: number[] = [];

  constructor(private readonly config: FootballDataOrgConfig) {}

  /** Fenêtre glissante simple : attend si on a déjà fait MAX_REQUESTS_PER_WINDOW requêtes dans la dernière minute. */
  private async throttle(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < WINDOW_MS);

    if (this.requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldest = this.requestTimestamps[0]!;
      const waitMs = WINDOW_MS - (now - oldest) + 250;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.throttle();
    }

    this.requestTimestamps.push(now);
  }

  private async request<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T> {
    await this.throttle();

    const url = new URL(BASE_URL + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url, { headers: { "X-Auth-Token": this.config.apiKey } });
    } catch (cause) {
      throw new FootballProviderError(`Échec réseau vers football-data.org (${path})`, cause);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new FootballProviderError(
        `football-data.org a répondu ${response.status} pour ${path}${text ? `: ${text}` : ""}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async getCompetitions(params: GetCompetitionsParams = {}): Promise<CompetitionDTO[]> {
    if (params.id) {
      const raw = await this.request<FdoCompetition>(`/competitions/${params.id}`);
      return [mapCompetition(raw)];
    }
    const raw = await this.request<{ competitions: FdoCompetition[] }>("/competitions");
    return raw.competitions.map(mapCompetition);
  }

  async getSeasons(competitionExternalId: string): Promise<SeasonDTO[]> {
    const raw = await this.request<FdoCompetition>(`/competitions/${competitionExternalId}`);
    const seasons = raw.seasons ?? (raw.currentSeason ? [raw.currentSeason] : []);
    return seasons.map((season) => mapSeason(season, competitionExternalId, raw.currentSeason?.id));
  }

  async getTeams(params: GetTeamsParams): Promise<TeamDTO[]> {
    const year = yearFromSeasonExternalId(params.seasonExternalId);
    const raw = await this.request<{ teams: FdoTeam[] }>(`/competitions/${params.competitionExternalId}/teams`, {
      season: year,
    });
    return raw.teams.map(mapTeam);
  }

  /**
   * Le plan gratuit n'expose que la liste d'effectif (nom, poste, nationalité,
   * date de naissance) via le détail d'équipe — pas de photo, pas de numéro de
   * maillot, pas de taille/poids : ces champs restent `null`, jamais devinés.
   */
  async getPlayers(params: GetPlayersParams): Promise<PlayerDTO[]> {
    const raw = await this.request<FdoTeamDetail>(`/teams/${params.teamExternalId}`);
    return (raw.squad ?? []).map((player) => mapPlayer(player, params.teamExternalId));
  }

  async getFixtures(params: GetFixturesParams): Promise<FixtureDTO[]> {
    const query = {
      dateFrom: params.dateFrom ? formatDate(params.dateFrom) : undefined,
      dateTo: params.dateTo ? formatDate(params.dateTo) : undefined,
    };
    const path = params.competitionExternalId
      ? `/competitions/${params.competitionExternalId}/matches`
      : "/matches";
    const raw = await this.request<{ matches: FdoMatch[] }>(path, query);
    return raw.matches.map(mapFixture);
  }

  /**
   * `status=LIVE` est traduit côté API en IN_PLAY + PAUSED (mi-temps incluse)
   * — confirmé empiriquement, pas une supposition.
   */
  async getLiveScores(): Promise<FixtureDTO[]> {
    const raw = await this.request<{ matches: FdoMatch[] }>("/matches", { status: "LIVE" });
    return raw.matches.map(mapFixture);
  }

  /** Pas d'événements minute par minute sur ce plan — `events` reste vide, jamais reconstitué à partir du score final. */
  async getFixtureDetail(fixtureExternalId: string): Promise<FixtureDetailDTO | null> {
    const raw = await this.request<FdoMatch | { message: string }>(`/matches/${fixtureExternalId}`).catch(
      () => null,
    );
    if (!raw || "message" in raw) return null;
    return { ...mapFixture(raw), events: [] };
  }

  async getStandings(params: GetStandingsParams): Promise<StandingDTO[]> {
    const year = yearFromSeasonExternalId(params.seasonExternalId);
    const raw = await this.request<{ standings: FdoStandingsGroup[] }>(
      `/competitions/${params.competitionExternalId}/standings`,
      { season: year },
    );
    const totalGroups = raw.standings.filter((group) => group.type === "TOTAL");
    return totalGroups.flatMap((group) =>
      group.table.map((row) => mapStanding(row, totalGroups.length > 1 ? group.group : null)),
    );
  }

  /** Pas de statistiques d'équipe sur ce plan (possession, tirs…) — `null` plutôt qu'un objet à moitié rempli. */
  async getTeamStatistics(_params: GetTeamStatisticsParams): Promise<TeamStatisticsDTO | null> {
    return null;
  }

  /** Pas de statistiques joueur sur ce plan — liste vide, jamais inventée. */
  async getPlayerStatistics(_params: GetPlayerStatisticsParams): Promise<PlayerStatisticsDTO[]> {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Formes brutes football-data.org (partielles — uniquement les champs lus).
// ---------------------------------------------------------------------------

interface FdoArea {
  name: string | null;
  code: string | null;
}

interface FdoSeason {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday: number | null;
}

interface FdoCompetition {
  id: number;
  name: string;
  type: string;
  emblem: string | null;
  area: FdoArea;
  currentSeason?: FdoSeason;
  seasons?: FdoSeason[];
}

interface FdoTeam {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  founded: number | null;
  venue: string | null;
  area?: FdoArea;
}

interface FdoSquadPlayer {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
}

interface FdoTeamDetail extends FdoTeam {
  squad?: FdoSquadPlayer[];
}

interface FdoMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  minute?: number | null;
  venue?: string | null;
  competition: { id: number };
  season: { id: number; startDate: string };
  homeTeam: { id: number };
  awayTeam: { id: number };
  score: { fullTime: { home: number | null; away: number | null } };
  referees?: Array<{ name: string }>;
}

interface FdoStandingRow {
  position: number;
  team: { id: number };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}

interface FdoStandingsGroup {
  type: string;
  group: string | null;
  table: FdoStandingRow[];
}

// ---------------------------------------------------------------------------
// Mappers — football-data.org brut -> DTO normalisé
// ---------------------------------------------------------------------------

function mapCompetition(raw: FdoCompetition): CompetitionDTO {
  return {
    externalId: String(raw.id),
    name: raw.name,
    // football-data.org utilise déjà "LEAGUE"/"CUP", identiques à notre enum.
    type: raw.type === "CUP" ? "CUP" : "LEAGUE",
    logoUrl: raw.emblem,
    countryName: raw.area?.name ?? null,
    countryCode: raw.area?.code ?? null,
  };
}

/**
 * externalId = "{competitionId}-{année}" : l'API n'accepte que l'année en
 * paramètre `season` (pas son id interne, testé et confirmé 404), mais la
 * contrainte d'unicité de Season est globale par fournisseur — une simple
 * année ("2025") collisionnerait entre compétitions différentes. Ce format
 * composite reste unique tout en permettant de retrouver l'année (voir
 * yearFromSeasonExternalId) sans appel supplémentaire.
 */
function mapSeason(season: FdoSeason, competitionExternalId: string, currentSeasonId?: number): SeasonDTO {
  const year = season.startDate.slice(0, 4);
  return {
    externalId: `${competitionExternalId}-${year}`,
    competitionExternalId,
    year,
    startDate: season.startDate,
    endDate: season.endDate,
    isCurrent: currentSeasonId !== undefined ? season.id === currentSeasonId : true,
  };
}

function yearFromSeasonExternalId(seasonExternalId: string): string {
  return seasonExternalId.split("-").at(-1)!;
}

function mapTeam(raw: FdoTeam): TeamDTO {
  return {
    externalId: String(raw.id),
    name: raw.name,
    shortName: raw.shortName ?? raw.tla,
    crestUrl: raw.crest,
    foundedYear: raw.founded,
    venueName: raw.venue,
    venueCity: null,
    countryCode: raw.area?.code ?? null,
  };
}

function mapPosition(raw: string | null): PlayerDTO["position"] {
  if (!raw) return null;
  const value = raw.toLowerCase();
  if (value.includes("goal")) return "GOALKEEPER";
  if (value.includes("def")) return "DEFENDER";
  if (value.includes("mid")) return "MIDFIELDER";
  if (value.includes("off") || value.includes("att") || value.includes("forw")) return "FORWARD";
  return null;
}

function mapPlayer(raw: FdoSquadPlayer, teamExternalId: string): PlayerDTO {
  const [firstName, ...rest] = raw.name.trim().split(" ");
  return {
    externalId: String(raw.id),
    firstName: firstName ?? raw.name,
    lastName: rest.join(" "),
    displayName: raw.name,
    photoUrl: null,
    dateOfBirth: raw.dateOfBirth,
    nationality: raw.nationality,
    position: mapPosition(raw.position),
    heightCm: null,
    weightKg: null,
    teamExternalId,
    shirtNumber: null,
  };
}

function mapFixture(raw: FdoMatch): FixtureDTO {
  return {
    externalId: String(raw.id),
    competitionExternalId: String(raw.competition.id),
    seasonExternalId: `${raw.competition.id}-${raw.season.startDate.slice(0, 4)}`,
    homeTeamExternalId: String(raw.homeTeam.id),
    awayTeamExternalId: String(raw.awayTeam.id),
    round: raw.matchday !== null ? `Matchday ${raw.matchday}` : null,
    kickoffAt: raw.utcDate,
    status: STATUS_MAP[raw.status] ?? "SCHEDULED",
    minute: raw.minute ?? null,
    homeScore: raw.score.fullTime.home,
    awayScore: raw.score.fullTime.away,
    venueName: raw.venue ?? null,
    referee: raw.referees?.[0]?.name ?? null,
  };
}

function mapStanding(row: FdoStandingRow, groupName: string | null): StandingDTO {
  return {
    teamExternalId: String(row.team.id),
    groupName,
    position: row.position,
    played: row.playedGames,
    won: row.won,
    drawn: row.draw,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalDifference,
    points: row.points,
    form: row.form,
  };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
