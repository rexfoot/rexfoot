import { FEATURED_COMPETITION_SLUGS } from "@rexfoot/config";
import type { FootballDataProvider } from "@rexfoot/football-provider";
import type { Competition } from "@rexfoot/db";
import { slugify } from "./slugify.js";
import { upsertCompetition } from "./upsert.js";
import { logger } from "./logger.js";

/**
 * Résout les compétitions "vedettes" (FEATURED_COMPETITION_SLUGS) contre la
 * liste renvoyée par le fournisseur, en comparant le slug du nom. Upsert
 * chaque compétition trouvée. Les compétitions non trouvées sont juste
 * loguées — ça n'empêche pas la sync des autres.
 */
export async function resolveFeaturedCompetitions(
  provider: FootballDataProvider,
): Promise<Array<{ competition: Competition; externalId: string }>> {
  const all = await provider.getCompetitions();
  const bySlug = new Map(all.map((dto) => [slugify(dto.name), dto]));

  const resolved: Array<{ competition: Competition; externalId: string }> = [];
  for (const slug of FEATURED_COMPETITION_SLUGS) {
    const dto = bySlug.get(slug);
    if (!dto) {
      logger.warn({ slug }, "Compétition vedette introuvable chez le fournisseur");
      continue;
    }
    const competition = await upsertCompetition(dto);
    resolved.push({ competition, externalId: dto.externalId });
  }
  return resolved;
}
