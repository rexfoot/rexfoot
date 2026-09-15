import { FEATURED_COMPETITION_SLUGS, type FeaturedCompetitionSlug } from "@rexfoot/config";
import type { FootballDataProvider } from "@rexfoot/football-provider";
import type { Competition } from "@rexfoot/db";
import { upsertCompetition } from "./upsert.js";
import { logger } from "./logger.js";

/**
 * IDs de compétition football-data.org (stables, documentés publiquement)
 * pour chaque compétition vedette. On résout par ID plutôt que par nom
 * slugifié : le nom exact renvoyé par l'API ne correspond pas toujours à
 * notre slug ("UEFA Champions League" ≠ "champions-league"), et un nom de
 * championnat comme "Premier League" ou "Serie A" existe dans plusieurs pays
 * — matcher par nom seul risque de résoudre la mauvaise compétition sans
 * erreur visible.
 *
 * Les compétitions européennes (europa-league, europa-conference-league)
 * ne sont pas disponibles sur le plan gratuit football-data.org —
 * resolveFeaturedCompetitions les logue et les ignore si le fournisseur
 * ne les renvoie pas.
 */
const FOOTBALL_DATA_ORG_COMPETITION_IDS: Partial<Record<FeaturedCompetitionSlug, string>> = {
  "premier-league": "2021",
  "la-liga": "2014",
  "ligue-1": "2015",
  "serie-a": "2019",
  bundesliga: "2002",
  "champions-league": "2001",
  "europa-league": "2146",
  "europa-conference-league": "2154",
  "european-championship": "2018",
  "world-cup": "2000",
  "fa-cup": "2055",
  "league-cup": "2139",
  "copa-del-rey": "2079",
  "coppa-italia": "2122",
  "dfb-pokal": "2011",
};

/**
 * Résout chaque compétition vedette directement par son ID externe connu.
 * Upsert celles trouvées ; les autres (introuvables ou non disponibles sur
 * ce plan) sont juste loguées (ne bloque pas la sync des autres compétitions).
 */
export async function resolveFeaturedCompetitions(
  provider: FootballDataProvider,
): Promise<Array<{ competition: Competition; externalId: string }>> {
  const resolved: Array<{ competition: Competition; externalId: string }> = [];

  for (const slug of FEATURED_COMPETITION_SLUGS) {
    const id = FOOTBALL_DATA_ORG_COMPETITION_IDS[slug];
    if (!id) {
      logger.info({ slug }, "Compétition vedette non disponible chez ce fournisseur, ignorée");
      continue;
    }
    try {
      const [dto] = await provider.getCompetitions({ id });
      if (!dto) {
        logger.warn({ slug, id }, "Compétition vedette introuvable chez le fournisseur");
        continue;
      }
      const competition = await upsertCompetition(dto, slug);
      resolved.push({ competition, externalId: dto.externalId });
    } catch (err) {
      // Une compétition en échec (quota, erreur réseau, etc.) ne doit pas
      // empêcher la synchronisation des 6 autres.
      logger.error({ slug, id, err }, "Échec de résolution d'une compétition vedette");
    }
  }

  return resolved;
}
