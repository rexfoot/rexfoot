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

const BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";

/**
 * ESPN public API — aucune clé API requise, aucun quota documenté.
 * Couvre les 8 coupes manquantes de football-data.org :
 *   Europa League, Conference League, FA Cup, League Cup,
 *   Copa del Rey, Coppa Italia, DFB-Pokal, Coupe de France.
 *
 * Limites connues :
 *   - Pas de standings pour les coupes (knockout)
 *   - Le scoreboard sans filtre ne renvoie que les matchs à venir + quelques
 *     résultats récents — pas l'historique complet de la saison
 *   - Pas de xG, pas de stats détaillées (possessions, tirs…)
 *   - Pas de players/squad (roster existe mais pas au format FootballDataProvider)
 *
 * Chaque méthode non supportée renvoie une liste vide / `null` — jamais
 * d'erreur, jamais de fausse donnée.
 */
export class EspnProvider implements FootballDataProvider {
  private async request<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "RexFoot/1.0" },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new FootballProviderError(`ESPN a répondu ${response.status} pour ${url}: ${text}`);
      }
      return (await response.json()) as T;
    } catch (cause) {
      if (cause instanceof FootballProviderError) throw cause;
      throw new FootballProviderError(`Échec réseau vers ESPN (${url})`, cause);
    }
  }

  // ── getCompetitions ──────────────────────────────────────────────────

  async getCompetitions(params?: GetCompetitionsParams): Promise<CompetitionDTO[]> {
    if (!params?.id) return [];

    // L'id est le slug ESPN (ex. "uefa.europa")
    const slug = params.id;
    try {
      const data = await this.request<EspnScoreboard>(`${BASE_URL}/${slug}/scoreboard`);
      const league = data.leagues?.[0];
      if (!league) return [];

      return [
        {
          externalId: slug,
          name: league.name ?? league.slug ?? slug,
          type: (ESPN_LEAGUE_SLUGS as readonly string[]).includes(slug) ? "LEAGUE" : "CUP",
          logoUrl: null,
          countryName: null,
          countryCode: null,
        },
      ];
    } catch {
      return [];
    }
  }

  // ── getSeasons ───────────────────────────────────────────────────────

  async getSeasons(competitionExternalId: string): Promise<SeasonDTO[]> {
    const slug = competitionExternalId;
    try {
      const data = await this.request<EspnScoreboard>(`${BASE_URL}/${slug}/scoreboard`);
      const season = data.season;
      if (!season) return [];

      const year = String(season.year ?? new Date().getFullYear());
      return [
        {
          externalId: `${slug}-${year}`,
          competitionExternalId: slug,
          year,
          startDate: null,
          endDate: null,
          isCurrent: true,
        },
      ];
    } catch {
      return [];
    }
  }

  // ── getTeams ─────────────────────────────────────────────────────────

  async getTeams(params: GetTeamsParams): Promise<TeamDTO[]> {
    const slug = params.competitionExternalId;
    try {
      const data = await this.request<EspnTeamsResponse>(`${BASE_URL}/${slug}/teams`);
      const teams = data.sports?.[0]?.leagues?.[0]?.teams;
      if (!teams) return [];

      return teams.map((t) => mapTeam(t.team, slug));
    } catch {
      return [];
    }
  }

  // ── getPlayers ───────────────────────────────────────────────────────
  // ESPN ne fournit pas de roster au format attendu — liste vide.

  async getPlayers(_params: GetPlayersParams): Promise<PlayerDTO[]> {
    return [];
  }

  // ── getFixtures ──────────────────────────────────────────────────────
  // Le scoreboard ESPN sans filtre renvoie les matchs à venir + quelques
  // résultats récents. Pas de support pour dateFrom/dateTo — on retourne
  // ce que l'API donne.

  async getFixtures(params: GetFixturesParams): Promise<FixtureDTO[]> {
    const slug = params.competitionExternalId;
    if (!slug) return [];

    try {
      const data = await this.request<EspnScoreboard>(`${BASE_URL}/${slug}/scoreboard`);
      if (!data.events) return [];

      return data.events.map((e) => mapFixture(e, slug, data.season));
    } catch {
      return [];
    }
  }

  // ── getLiveScores ────────────────────────────────────────────────────
  // On interroge chaque slug ESPN connu pour les matchs en direct.

  async getLiveScores(): Promise<FixtureDTO[]> {
    const slugs = ESPN_ALL_SLUGS;
    const results: FixtureDTO[] = [];

    for (const slug of slugs) {
      try {
        const data = await this.request<EspnScoreboard>(`${BASE_URL}/${slug}/scoreboard`);
        if (!data.events) continue;

        for (const event of data.events) {
          if (isLiveStatus(event.status ?? event.competitions?.[0]?.status)) {
            results.push(mapFixture(event, slug, data.season));
          }
        }
      } catch {
        // Un slug qui échoue ne doit pas bloquer les autres.
      }
    }

    return results;
  }

  // ── getFixtureDetail ─────────────────────────────────────────────────

  async getFixtureDetail(fixtureExternalId: string): Promise<FixtureDetailDTO | null> {
    // Le detail nécessite le slug de la ligue — on essaie tous les slugs
    // connus jusqu'à trouver le match.
    for (const slug of ESPN_ALL_SLUGS) {
      try {
        const data = await this.request<EspnScoreboard>(`${BASE_URL}/${slug}/scoreboard`);
        const event = data.events?.find((e) => String(e.id) === fixtureExternalId);
        if (event) {
          return { ...mapFixture(event, slug, data.season), events: [] };
        }
      } catch {
        // continuer
      }
    }
    return null;
  }

  // ── getStandings ─────────────────────────────────────────────────────
  // Pas de standings pour les coupes (knockout).

  async getStandings(_params: GetStandingsParams): Promise<StandingDTO[]> {
    return [];
  }

  // ── getTeamStatistics ────────────────────────────────────────────────
  // Pas de stats détaillées sur l'API publique ESPN.

  async getTeamStatistics(_params: GetTeamStatisticsParams): Promise<TeamStatisticsDTO | null> {
    return null;
  }

  // ── getPlayerStatistics ──────────────────────────────────────────────

  async getPlayerStatistics(_params: GetPlayerStatisticsParams): Promise<PlayerStatisticsDTO[]> {
    return [];
  }
}

// ── Slugs ESPN : championnats (direct + calendriers, plan 100 % gratuit) ──

export const ESPN_LEAGUE_SLUGS = [
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "uefa.champions",
] as const;

// ── Slugs ESPN pour les 8 coupes ─────────────────────────────────────────

export const ESPN_SLUGS = [
  "uefa.europa",
  "uefa.europa.conf",
  "eng.fa",
  "eng.league_cup",
  "esp.copa_del_rey",
  "ita.coppa_italia",
  "ger.dfb_pokal",
  "fra.coupe_de_france",
  "uefa.nations",
] as const;

/** Tous les slugs interrogés pour le direct et la recherche de match. */
export const ESPN_ALL_SLUGS: readonly string[] = [...ESPN_LEAGUE_SLUGS, ...ESPN_SLUGS];

/** Map notre FeaturedCompetitionSlug → slug ESPN. */
export const COMPETITION_TO_ESPN_SLUG: Record<string, string> = {
  "premier-league": "eng.1",
  "la-liga": "esp.1",
  "serie-a": "ita.1",
  "bundesliga": "ger.1",
  "ligue-1": "fra.1",
  "champions-league": "uefa.champions",
  "europa-league": "uefa.europa",
  "europa-conference-league": "uefa.europa.conf",
  "fa-cup": "eng.fa",
  "league-cup": "eng.league_cup",
  "copa-del-rey": "esp.copa_del_rey",
  "coppa-italia": "ita.coppa_italia",
  "dfb-pokal": "ger.dfb_pokal",
  "coupe-de-france": "fra.coupe_de_france",
  // Absente de football-data.org en plan gratuit (confirmé sur leur page
  // /coverage, réservée aux plans payants) — slug ESPN public documenté :
  // https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/sports/soccer.md
  "nations-league": "uefa.nations",
};

// ── ESPN types (partiels) ────────────────────────────────────────────────

interface EspnStatusType {
  id?: string;
  name?: string;
  state?: string; // "pre" | "in" | "post"
  description?: string; // "Scheduled", "In Progress", "Full Time", etc.
  completed?: boolean;
  displayClock?: string;
  type?: {
    id?: string;
    name?: string;
    state?: string;
    description?: string;
    completed?: boolean;
  };
}

interface EspnTeam {
  id: string;
  displayName: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logo?: string;
  color?: string;
}

interface EspnCompetitor {
  id: string;
  homeAway: "home" | "away";
  team: EspnTeam;
  score?: string;
  records?: Array<{ name: string; summary: string }>;
}

interface EspnCompetition {
  id?: string;
  competitors: EspnCompetitor[];
  status?: EspnStatusType;
  venue?: { fullName?: string; address?: { city?: string } };
  date?: string;
}

interface EspnEvent {
  id: string;
  name: string;
  shortName?: string;
  date: string;
  status?: EspnStatusType;
  competitions?: EspnCompetition[];
  season?: { year: number };
}

interface EspnLeague {
  id?: string;
  name?: string;
  slug?: string;
  abbreviation?: string;
}

interface EspnSeason {
  year: number;
  displayName?: string;
}

interface EspnScoreboard {
  leagues?: EspnLeague[];
  season?: EspnSeason;
  events?: EspnEvent[];
}

interface EspnTeamEntry {
  team: EspnTeam;
}

interface EspnLeagueTeams {
  teams: EspnTeamEntry[];
}

interface EspnSportsLeague {
  leagues: EspnLeagueTeams[];
}

interface EspnTeamsResponse {
  sports?: EspnSportsLeague[];
}

// ── Status mapping ──────────────────────────────────────────────────────

const STATUS_MAP: Record<string, FixtureDTO["status"]> = {
  scheduled: "SCHEDULED",
  pre: "SCHEDULED",
  in: "LIVE",
  post: "FINISHED",
  // ESPN descriptions
  Scheduled: "SCHEDULED",
  "In Progress": "LIVE",
  Halftime: "HALFTIME",
  "Full Time": "FINISHED",
  Postponed: "POSTPONED",
  Cancelled: "CANCELLED",
  Delayed: "POSTPONED",
};

function isLiveStatus(status?: EspnStatusType): boolean {
  if (!status) return false;
  const state = status.type?.state ?? status.state;
  return state === "in";
}

function mapStatus(status?: EspnStatusType): FixtureDTO["status"] {
  if (!status) return "SCHEDULED";

  // ESPN imbrique parfois le statut dans status.type
  const effective = status.type ?? status;

  // Essayer d'abord par state, puis par description
  if (effective.state) {
    const mapped = STATUS_MAP[effective.state];
    if (mapped) return mapped;
  }
  if (effective.description) {
    const mapped = STATUS_MAP[effective.description];
    if (mapped) return mapped;
  }
  if (effective.completed) return "FINISHED";
  return "SCHEDULED";
}

// ── Mappers ─────────────────────────────────────────────────────────────

function mapTeam(raw: EspnTeam, _competitionSlug: string): TeamDTO {
  return {
    externalId: raw.id,
    name: raw.displayName,
    shortName: raw.shortDisplayName ?? raw.abbreviation ?? null,
    crestUrl: raw.logo ?? null,
    foundedYear: null,
    venueName: null,
    venueCity: null,
    countryCode: null,
  };
}

function mapFixture(event: EspnEvent, competitionSlug: string, season?: EspnSeason): FixtureDTO {
  const comp = event.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === "home");
  const away = comp?.competitors?.find((c) => c.homeAway === "away");
  const year = String(season?.year ?? new Date().getFullYear());

  return {
    externalId: String(event.id),
    competitionExternalId: competitionSlug,
    seasonExternalId: `${competitionSlug}-${year}`,
    homeTeamExternalId: home?.team?.id ?? "",
    awayTeamExternalId: away?.team?.id ?? "",
    round: null,
    kickoffAt: event.date,
    status: mapStatus(comp?.status ?? event.status),
    minute: null,
    homeScore: home?.score ? parseInt(home.score, 10) : null,
    awayScore: away?.score ? parseInt(away.score, 10) : null,
    venueName: comp?.venue?.fullName ?? null,
    referee: null,
  };
}
