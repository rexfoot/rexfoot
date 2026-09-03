// Client pour Highlightly (Sport Highlights API, via RapidAPI) — complète
// football-data.org avec ce qu'il n'expose pas sur son plan gratuit :
// événements minute par minute, compositions, statistiques. Volontairement
// séparé de FootballDataProvider (interface pour la synchro principale des
// fixtures) : Highlightly n'est qu'une source d'enrichissement optionnelle,
// jamais un remplacement, et son quota gratuit (100 requêtes/jour) impose une
// utilisation ciblée pilotée par apps/worker/src/jobs/syncMatchEvents.ts plutôt
// qu'un provider générique interchangeable.

const BASE_URL = "https://sport-highlights-api.p.rapidapi.com";

export class HighlightlyProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "HighlightlyProviderError";
  }
}

export interface HighlightlyEvent {
  team: { id: number; name: string };
  time: string;
  type: string;
  player: string | null;
  assist: string | null;
  substituted: string | null;
}

interface HighlightlyMatchSearchResult {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
}

export interface HighlightlyLineupPlayer {
  name: string;
  number: number | null;
  position: string | null;
}

export interface HighlightlyTeamLineup {
  name: string;
  formation: string | null;
  /// Tableau de lignes tactiques (gardien, défense, milieu, attaque) tel que
  /// renvoyé par Highlightly — aplati par le job de synchro avant stockage
  /// (voir syncMatchEvents.ts), gardé imbriqué ici pour coller à la réponse brute.
  initialLineup: HighlightlyLineupPlayer[][];
  substitutes: HighlightlyLineupPlayer[];
}

export interface HighlightlyLineups {
  homeTeam: HighlightlyTeamLineup;
  awayTeam: HighlightlyTeamLineup;
}

export interface HighlightlyTeamStatistics {
  team: { name: string };
  statistics: Array<{ value: number; displayName: string }>;
}

export class HighlightlyClient {
  constructor(private readonly apiKey: string) {}

  private async request<T>(path: string, query: Record<string, string | undefined> = {}): Promise<T> {
    const url = new URL(BASE_URL + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "x-rapidapi-host": "sport-highlights-api.p.rapidapi.com",
          "x-rapidapi-key": this.apiKey,
        },
      });
    } catch (cause) {
      throw new HighlightlyProviderError(`Échec réseau vers Highlightly (${path})`, cause);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new HighlightlyProviderError(
        `Highlightly a répondu ${response.status} pour ${path}${text ? `: ${text}` : ""}`,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Résout l'id Highlightly d'un match par pays + date, puis compare les deux
   * noms d'équipe nous-mêmes — jamais en passant homeTeamName/awayTeamName en
   * paramètre de requête : testé et confirmé, Highlightly attend une
   * correspondance exacte sur son propre nom court ("Toulouse"), alors que nos
   * données (football-data.org) donnent des noms officiels complets
   * ("Toulouse FC") — un filtre serveur par nom échouerait silencieusement la
   * plupart du temps. `countryName` est optionnel (absent pour une compétition
   * internationale comme la Ligue des champions) : sans lui, la recherche par
   * date seule reste correcte mais renvoie plus de matchs à comparer.
   */
  async findMatchId(
    homeTeamName: string,
    awayTeamName: string,
    dateISO: string,
    countryName?: string | null,
  ): Promise<number | null> {
    const date = dateISO.slice(0, 10);
    const result = await this.request<{ data: HighlightlyMatchSearchResult[] }>("/football/matches", {
      date,
      countryName: countryName ?? undefined,
    });

    const normalize = (s: string) => s.toLowerCase().trim();
    const sameTeam = (a: string, b: string) => {
      const [na, nb] = [normalize(a), normalize(b)];
      return na === nb || na.includes(nb) || nb.includes(na);
    };

    const match = result.data.find(
      (m) => sameTeam(m.homeTeam.name, homeTeamName) && sameTeam(m.awayTeam.name, awayTeamName),
    );
    return match?.id ?? null;
  }

  async getEvents(highlightlyMatchId: number): Promise<HighlightlyEvent[]> {
    return this.request<HighlightlyEvent[]>(`/football/events/${highlightlyMatchId}`);
  }

  async getLineups(highlightlyMatchId: number): Promise<HighlightlyLineups> {
    return this.request<HighlightlyLineups>(`/football/lineups/${highlightlyMatchId}`);
  }

  async getStatistics(highlightlyMatchId: number): Promise<HighlightlyTeamStatistics[]> {
    return this.request<HighlightlyTeamStatistics[]>(`/football/statistics/${highlightlyMatchId}`);
  }
}

export function createHighlightlyClient(apiKey: string): HighlightlyClient {
  return new HighlightlyClient(apiKey);
}
