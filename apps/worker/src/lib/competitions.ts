import { FEATURED_COMPETITION_SLUGS, type FeaturedCompetitionSlug } from "@rexfoot/config";
import type { FootballDataProvider } from "@rexfoot/football-provider";
import type { Competition } from "@rexfoot/db";
import { upsertCompetition } from "./upsert.js";
import { logger } from "./logger.js";

/**
 * IDs de ligue API-Football (stables, documentés publiquement) pour chaque
 * compétition vedette. On résout par ID plutôt que par nom slugifié : le nom
 * exact renvoyé par l'API ne correspond pas toujours à notre slug ("UEFA
 * Champions League" ≠ "champions-league"), et un nom de championnat comme
 * "Premier League" ou "Serie A" existe dans plusieurs pays — matcher par
 * nom seul risque de résoudre la mauvaise compétition sans erreur visible.
 */
const API_FOOTBALL_LEAGUE_IDS: Record<FeaturedCompetitionSlug, string> = {
  "premier-league": "39",
  "la-liga": "140",
  "ligue-1": "61",
  "serie-a": "135",
  bundesliga: "78",
  "champions-league": "2",
  "europa-league": "3",
};

/**
 * Résout chaque compétition vedette directement par son ID externe connu.
 * Upsert celles trouvées ; les autres sont juste loguées (ne bloque pas la
 * sync des autres compétitions).
 */
export async function resolveFeaturedCompetitions(
  provider: FootballDataProvider,
): Promise<Array<{ competition: Competition; externalId: string }>> {
  const resolved: Array<{ competition: Competition; externalId: string }> = [];

  for (const slug of FEATURED_COMPETITION_SLUGS) {
    const id = API_FOOTBALL_LEAGUE_IDS[slug];
    try {
      const [dto] = await provider.getCompetitions({ id });
      if (!dto) {
        logger.warn({ slug, id }, "Compétition vedette introuvable chez le fournisseur");
        continue;
      }
      const competition = await upsertCompetition(dto);
      resolved.push({ competition, externalId: dto.externalId });
    } catch (err) {
      // Une compétition en échec (quota, erreur réseau, etc.) ne doit pas
      // empêcher la synchronisation des 6 autres.
      logger.error({ slug, id, err }, "Échec de résolution d'une compétition vedette");
    }
  }

  return resolved;
}
