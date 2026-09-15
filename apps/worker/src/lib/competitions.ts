import { prisma } from "@rexfoot/db";
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
 * `coupe-de-france` est volontairement absente : pas disponible sur
 * football-data.org. Elle est résolue via le provider secondaire
 * (API-Football) dans la map ci-dessous.
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
 * IDs API-Football pour les compétitions non couvertes par football-data.org.
 * Réservé au provider secondaire (API-Football) — utilisé uniquement quand le
 * provider composite est actif (les deux clés configurées).
 *
 * TODO: Vérifier/confirmé ces IDs une fois le compte API-Football réactivé.
 * L'ID Coupe de France (165) provient de la documentation tierce
 * (apifootball.com) — à valider via GET /leagues?search=coupe+de+france.
 */
const API_FOOTBALL_COMPETITION_IDS: Partial<Record<FeaturedCompetitionSlug, string>> = {
  "coupe-de-france": "165",
};

/**
 * Métadonnées de repli pour les compétitions que l'API ne renvoie pas
 * (plan gratuit, erreur temporaire, etc.). Permet de créer un enregistrement
 * minimal en DB pour que l'onglet apareîsse dans l'UI — les données réelles
 * (saisons, équipes, matchs) seront remplies quand le fournisseur les
 * fournira.
 */
const COMPETITION_FALLBACK_META: Record<
  FeaturedCompetitionSlug,
  { name: string; type: "LEAGUE" | "CUP" | "INTERNATIONAL"; countryName: string | null; countryCode: string | null; tier: number }
> = {
  "premier-league": { name: "Premier League", type: "LEAGUE", countryName: "England", countryCode: "GB", tier: 1 },
  "la-liga": { name: "La Liga", type: "LEAGUE", countryName: "Spain", countryCode: "ES", tier: 2 },
  "ligue-1": { name: "Ligue 1", type: "LEAGUE", countryName: "France", countryCode: "FR", tier: 3 },
  "serie-a": { name: "Serie A", type: "LEAGUE", countryName: "Italy", countryCode: "IT", tier: 4 },
  bundesliga: { name: "Bundesliga", type: "LEAGUE", countryName: "Germany", countryCode: "DE", tier: 5 },
  "champions-league": { name: "UEFA Champions League", type: "INTERNATIONAL", countryName: null, countryCode: null, tier: 6 },
  "europa-league": { name: "UEFA Europa League", type: "INTERNATIONAL", countryName: null, countryCode: null, tier: 7 },
  "europa-conference-league": { name: "UEFA Europa Conference League", type: "INTERNATIONAL", countryName: null, countryCode: null, tier: 8 },
  "european-championship": { name: "European Championship", type: "INTERNATIONAL", countryName: null, countryCode: null, tier: 9 },
  "world-cup": { name: "FIFA World Cup", type: "INTERNATIONAL", countryName: null, countryCode: null, tier: 10 },
  "fa-cup": { name: "FA Cup", type: "CUP", countryName: "England", countryCode: "GB", tier: 11 },
  "league-cup": { name: "EFL Cup", type: "CUP", countryName: "England", countryCode: "GB", tier: 12 },
  "copa-del-rey": { name: "Copa del Rey", type: "CUP", countryName: "Spain", countryCode: "ES", tier: 13 },
  "coppa-italia": { name: "Coppa Italia", type: "CUP", countryName: "Italy", countryCode: "IT", tier: 14 },
  "dfb-pokal": { name: "DFB-Pokal", type: "CUP", countryName: "Germany", countryCode: "DE", tier: 15 },
  "coupe-de-france": { name: "Coupe de France", type: "CUP", countryName: "France", countryCode: "FR", tier: 16 },
};

/**
 * Résout chaque compétition vedette en essayant le provider principal
 * (football-data.org) d'abord. Quand le provider composite est actif, les
 * compétitions non couvertes par football-data.org (ex. Coupe de France)
 * sont automatiquement résolues via le provider secondaire (API-Football)
 * — le routage est géré en interne par le composite.
 *
 * Crée un enregistrement minimal en DB si aucun fournisseur ne renvoie de
 * données (compétition non couverte, erreur réseau, etc.).
 */
export async function resolveFeaturedCompetitions(
  provider: FootballDataProvider,
): Promise<Array<{ competition: Competition; externalId: string }>> {
  const resolved: Array<{ competition: Competition; externalId: string }> = [];

  for (const slug of FEATURED_COMPETITION_SLUGS) {
    const fdoId = FOOTBALL_DATA_ORG_COMPETITION_IDS[slug];
    const apiId = API_FOOTBALL_COMPETITION_IDS[slug];

    // Détermine l'ID à tester : football-data.org en priorité, sinon API-Football.
    const tryId = fdoId ?? apiId;
    if (!tryId) {
      // Aucun ID connu : enregistrement minimal.
      const competition = await upsertMinimalCompetition(slug);
      resolved.push({ competition, externalId: "" });
      continue;
    }

    try {
      // Le provider (composite ou non) gère le routage interne :
      // - Si c'est un CompositeFootballProvider, il essaie primary puis secondary.
      // - Sinon, il utilise le provider unique.
      const [dto] = await provider.getCompetitions({ id: tryId });
      if (!dto) {
        logger.warn({ slug, id: tryId }, "Compétition introuvable chez tous les fournisseurs — enregistrement minimal créé");
        const competition = await upsertMinimalCompetition(slug);
        resolved.push({ competition, externalId: "" });
        continue;
      }
      const competition = await upsertCompetition(dto, slug);
      resolved.push({ competition, externalId: dto.externalId });
    } catch (err) {
      logger.error({ slug, id: tryId, err }, "Échec de résolution — enregistrement minimal créé");
      const competition = await upsertMinimalCompetition(slug);
      resolved.push({ competition, externalId: "" });
    }
  }

  return resolved;
}

/**
 * Crée ou met à jour un enregistrement Competition minimal à partir des
 * métadonnées de repli, sans appeler l'API. Le slug est toujours fixé via
 * slugOverride pour garantir la cohérence avec FEATURED_COMPETITION_SLUGS.
 */
async function upsertMinimalCompetition(slug: FeaturedCompetitionSlug): Promise<Competition> {
  const meta = COMPETITION_FALLBACK_META[slug];
  if (!meta) {
    throw new Error(`Aucune métadonnée de repli pour la compétition "${slug}"`);
  }
  return prisma.competition.upsert({
    where: {
      provider_externalId: { provider: "fallback", externalId: slug },
    },
    create: {
      provider: "fallback",
      externalId: slug,
      name: meta.name,
      slug,
      type: meta.type,
      logoUrl: null,
      countryName: meta.countryName,
      countryCode: meta.countryCode,
      tier: meta.tier,
    },
    update: {
      name: meta.name,
      slug,
      type: meta.type,
      countryName: meta.countryName,
      countryCode: meta.countryCode,
      tier: meta.tier,
    },
  });
}
