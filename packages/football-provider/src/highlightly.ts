// Client pour Highlightly (Sport Highlights API, via RapidAPI) — complète
// football-data.org avec ce qu'il n'expose pas sur son plan gratuit :
// événements minute par minute, compositions, statistiques. Volontairement
// séparé de FootballDataProvider (interface pour la synchro principale des
// fixtures) : Highlightly n'est qu'une source d'enrichissement optionnelle,
// jamais un remplacement, et son quota gratuit (100 requêtes/jour) impose une
// utilisation ciblée pilotée par apps/worker/src/jobs/syncMatchEvents.ts plutôt
// qu'un provider générique interchangeable.

const BASE_URL = "https://sport-highlights-api.p.rapidapi.com";

// Mots génériques (suffixes/préfixes corporate + prépositions) à ignorer en
// comparant un nom d'équipe Highlightly à un nom football-data.org — les deux
// fournisseurs n'utilisent pas la même convention de nommage pour la même
// équipe (ex. "Club Atlético de Madrid" chez football-data.org vs "Atlético
// Madrid" chez Highlightly, "Sporting Clube de Portugal" vs "Sporting CP").
// Bug réel constaté en prod (2026-09-09) : une simple comparaison par
// sous-chaîne (sans retirer ces mots) échouait sur Atlético Madrid, Sporting
// CP et Paris Saint-Germain (tiret vs espace) — highlightlyId ne se résolvait
// jamais pour ces matchs malgré la bonne compétition/date, donc aucun
// but/carton/composition synchronisé pour eux de toute la rencontre.
const CLUB_NAME_STOPWORDS = new Set([
  "fc", "cf", "sk", "cp", "sc", "ac", "afc", "fk", "club", "clube", "de", "do", "da",
]);

function normalizeTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // retire les accents (Š -> S, é -> e...)
    .toLowerCase()
    .replace(/[-.]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !CLUB_NAME_STOPWORDS.has(word))
    .join(" ")
    .trim();
}

/** Compare deux noms d'équipe malgré des conventions de nommage différentes entre fournisseurs — voir CLUB_NAME_STOPWORDS. */
export function sameTeamName(a: string, b: string): boolean {
  const [na, nb] = [normalizeTeamName(a), normalizeTeamName(b)];
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

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
   *
   * Paginé : un pays avec beaucoup de divisions/coupes le même jour (ex.
   * Angleterre, 160 matchs un samedi entre Premier League, Championship,
   * National League, tours qualificatifs de FA Cup...) dépasse largement la
   * première page de 100 résultats. Bug réel constaté en prod (2026-09-05) :
   * Newcastle-Bournemouth (Premier League, très suivi) est tombé page 2 —
   * sans pagination ici, `findMatchId` renvoyait null pour toujours sur ce
   * match, donc aucun but/carton/composition jamais synchronisé de la
   * rencontre. Borné à MAX_PAGES pour ne pas exploser le quota journalier sur
   * un pays avec un nombre de matchs anormalement élevé.
   *
   * `leagueId` (optionnel) : passer l'id Highlightly de la compétition plutôt
   * que `countryName` quand on le connaît — remplace le filtre pays par un
   * filtre compétition directement dans la requête. Indispensable pour les
   * compétitions internationales (Europe/World ne sont pas de vrais pays,
   * donc `countryName` est déjà omis pour elles par l'appelant — voir
   * `highlightlyCountryName` dans syncMatchEvents.ts) : sans `leagueId`, la
   * recherche portait sur TOUS les matchs du monde entier ce jour-là, et le
   * plafond MAX_PAGES (300 résultats) ratait les matchs qui n'y figuraient
   * pas.
   *
   * Double bug réel constaté en prod (2026-09-09, soirée Ligue des Champions
   * à 4 matchs simultanés à 19h) : Liverpool-Atlético, Sporting-Galatasaray
   * et PSG-Slovan Bratislava sont restés sans le moindre événement toute la
   * rencontre (highlightlyId jamais résolu, 0 but affiché malgré un score
   * exact) alors que Napoli-Arsenal, tombé plus tôt dans le classement
   * mondial de ce jour-là, avait bien été trouvé. `leagueId` seul n'aurait
   * pas suffi : `sameTeamName` (voir plus haut) échouait aussi sur ces trois
   * matchs précis ("Club Atlético de Madrid" vs "Atlético Madrid", "Sporting
   * Clube de Portugal" vs "Sporting CP", tiret vs espace pour Paris
   * Saint-Germain) — une simple comparaison par sous-chaîne n'absorbe pas ces
   * écarts de nommage entre football-data.org et Highlightly. Les deux fixes
   * (leagueId + sameTeamName) étaient nécessaires ensemble.
   */
  async findMatchId(
    homeTeamName: string,
    awayTeamName: string,
    dateISO: string,
    countryName?: string | null,
    leagueId?: number,
  ): Promise<number | null> {
    const date = dateISO.slice(0, 10);
    const sameTeam = (a: string, b: string) => sameTeamName(a, b);

    const PAGE_SIZE = 100;
    const MAX_PAGES = 3;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await this.request<{ data: HighlightlyMatchSearchResult[]; pagination?: { totalCount: number } }>(
        "/football/matches",
        leagueId
          ? { date, leagueId: String(leagueId), offset: String(page * PAGE_SIZE), limit: String(PAGE_SIZE) }
          : { date, countryName: countryName ?? undefined, offset: String(page * PAGE_SIZE), limit: String(PAGE_SIZE) },
      );

      const match = result.data.find(
        (m) => sameTeam(m.homeTeam.name, homeTeamName) && sameTeam(m.awayTeam.name, awayTeamName),
      );
      if (match) return match.id;

      const totalCount = result.pagination?.totalCount ?? result.data.length;
      if ((page + 1) * PAGE_SIZE >= totalCount) break;
    }
    return null;
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

  /**
   * État temps réel (mi-temps/2e mi-temps/terminé + minute) — utilisé en
   * secours quand football-data.org reste bloqué sur IN_PLAY. Bug réel
   * constaté en prod (2026-09-05) : Newcastle-Bournemouth au repos dans la
   * réalité (confirmé ici, `description: "Half time"`) mais football-data.org
   * gardait IN_PLAY avec le MÊME lastUpdated pendant plus de 6 minutes
   * d'affilée — un vrai blocage côté fournisseur, pas notre code. Renvoie
   * `null` si le match n'est pas (ou plus) trouvé.
   */
  async getMatchState(highlightlyMatchId: number): Promise<{ description: string; clock: number | null } | null> {
    const result = await this.request<Array<{ state: { description: string; clock: number | null } }>>(
      `/football/matches/${highlightlyMatchId}`,
    );
    return result[0]?.state ?? null;
  }
}

export function createHighlightlyClient(apiKey: string): HighlightlyClient {
  return new HighlightlyClient(apiKey);
}
