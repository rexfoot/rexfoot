import { prisma } from "@rexfoot/db";
import { FEATURED_COMPETITION_SLUGS, type FeaturedCompetitionSlug } from "@rexfoot/config";
import type { FootballDataProvider } from "@rexfoot/football-provider";
import { COMPETITION_TO_ESPN_SLUG } from "@rexfoot/football-provider";
import type { Competition } from "@rexfoot/db";
import { upsertCompetition } from "./upsert.js";
import { logger } from "./logger.js";

/** Pause entre deux appels API-Football pour respecter la limite de débit (100 req/jour, ~10/min). */
const API_FOOTBALL_THROTTLE_MS = 3_000;

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
 * IDs API-Football v3 pour les compétitions non couvertes par football-data.org
 * (ou dont le plan gratuit renvoie 403). Réservé au provider secondaire
 * (API-Football) — utilisé uniquement quand le provider composite est actif
 * (les deux clés configurées).
 *
 * IDs vérifiés via la documentation API-Football et sources communautaires.
 * Les IDs v3 sont stables entre saisons (contrairement aux IDs v2).
 */
const API_FOOTBALL_COMPETITION_IDS: Partial<Record<FeaturedCompetitionSlug, string>> = {
  "europa-league": "3",
  "europa-conference-league": "4",
  "fa-cup": "45",
  "league-cup": "147",
  "copa-del-rey": "143",
  "coppa-italia": "137",
  "dfb-pokal": "81",
  "coupe-de-france": "66",
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
 * Résout chaque compétition vedette en essayant les providers dans l'ordre :
 *   1. football-data.org (par ID)
 *   2. ESPN (par slug — gratuit, sans clé, 8 coupes)
 *   3. API-Football (par ID — nécessite une clé valide)
 *
 * Le routage est géré en interne par le composite provider : quand un
 * provider ne couvre pas une compétition, le suivant est automatiquement
 * essayé. ESPN est intercalé entre FDO et API-Football car il est gratuit
 * et ne nécessite pas de clé — API-Football n'est consulté qu'en dernier
 * recours (compte souvent suspendu, plan gratuit limité aux saisons 2022-2024).
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
    const espnSlug = COMPETITION_TO_ESPN_SLUG[slug];
    const apiId = API_FOOTBALL_COMPETITION_IDS[slug];

    // IDs à essayer : FDO en priorité, ESPN (gratuit), puis API-Football.
    const idsToTry: Array<{ id: string; provider: string }> = [];
    if (fdoId) idsToTry.push({ id: fdoId, provider: "football-data-org" });
    if (espnSlug) idsToTry.push({ id: espnSlug, provider: "espn" });
    if (apiId) idsToTry.push({ id: apiId, provider: "api-football" });

    if (idsToTry.length === 0) {
      const competition = await upsertMinimalCompetition(slug);
      resolved.push({ competition, externalId: "" });
      continue;
    }

    let resolved_ = false;
    for (const { id: tryId, provider: tryProvider } of idsToTry) {
      try {
        const [dto] = await provider.getCompetitions({ id: tryId });
        if (dto) {
          const competition = await upsertCompetition(dto, slug, tryProvider);
          resolved.push({ competition, externalId: dto.externalId });
          resolved_ = true;
          break;
        }
      } catch (err) {
        logger.error({ slug, id: tryId, provider: tryProvider, err }, "Échec de résolution, essai suivant...");
      }
      // Délai uniquement entre les appels API-Football (quota limité).
      if (tryProvider === "api-football" && idsToTry.length > 1) {
        await new Promise((r) => setTimeout(r, API_FOOTBALL_THROTTLE_MS));
      }
    }

    if (!resolved_) {
      logger.warn({ slug }, "Aucun fournisseur n'a résolu cette compétition — enregistrement minimal créé");
      const competition = await upsertMinimalCompetition(slug);
      resolved.push({ competition, externalId: "" });
    }
  }

  return resolved;
}

/**
 * Crée ou met à jour un enregistrement Competition minimal à partir des
 * métadonnées de repli, sans appeler l'API. Recherche d'abord par slug
 * (unique) pour éviter les conflits quand la compétition existe déjà avec
 * un provider/externalId différent (ex. football-data.org → fallback).
 */
async function upsertMinimalCompetition(slug: FeaturedCompetitionSlug): Promise<Competition> {
  const meta = COMPETITION_FALLBACK_META[slug];
  if (!meta) {
    throw new Error(`Aucune métadonnée de repli pour la compétition "${slug}"`);
  }

  // Recherche par slug (unique) : si la compétition existe déjà (créée par
  // football-data.org ou un previous sync), on la met à jour plutôt que de
  // créer un doublon qui violerait la contrainte unique sur slug.
  const existing = await prisma.competition.findUnique({ where: { slug } });
  if (existing) {
    return prisma.competition.update({
      where: { id: existing.id },
      data: {
        name: meta.name,
        type: meta.type,
        countryName: meta.countryName,
        countryCode: meta.countryCode,
        tier: meta.tier,
      },
    });
  }

  return prisma.competition.create({
    data: {
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
  });
}
