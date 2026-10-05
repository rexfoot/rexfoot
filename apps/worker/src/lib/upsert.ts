import { prisma, type Competition, type Player, type Season, type Team } from "@rexfoot/db";
import { getActiveProviderName, type CompetitionDTO, type PlayerDTO, type SeasonDTO, type TeamDTO } from "@rexfoot/football-provider";
import { slugify } from "./slugify.js";

const PROVIDER_NAME = getActiveProviderName();

/**
 * Provider RÉEL d'un externalId, dérivé de son préfixe ("espn:445" →
 * "espn"). Les DTO qui traversent le composite/prefixed portent toujours
 * leur namespace, alors que PROVIDER_NAME n'est que le provider ACTIF
 * ("football-data-org" en prod) — chercher/créer avec PROVIDER_NAME un DTO
 * ESPN ne le trouve jamais puis tente un CREATE qui viole la contrainte
 * unique sur slug (constaté 2026-10-05 : toutes les sélections de la Nations
 * League rejetées, compétition vide malgré 8 matchs chez ESPN). Sans préfixe,
 * on retombe sur le provider actif (IDs FDO/API-Football non préfixés).
 */
export function providerForExternalId(externalId: string): string {
  const sep = externalId.indexOf(":");
  return sep > 0 ? externalId.slice(0, sep) : PROVIDER_NAME;
}

/**
 * `slugOverride` : le nom renvoyé par le fournisseur ne correspond pas
 * toujours au slug attendu par le reste du site (ex. football-data.org
 * nomme La Liga "Primera Division" → slugify donnerait "primera-division",
 * pas "la-liga" — la compétition existe alors en base mais devient invisible
 * partout où le site filtre par FEATURED_COMPETITION_SLUGS). Quand l'appelant
 * connaît déjà le slug attendu (resolveFeaturedCompetitions), on le fige
 * plutôt que de le dériver du nom. Inclus dans `update` aussi, pas seulement
 * `create` : une compétition déjà mal sluggée (créée avant ce fix) se corrige
 * au prochain sync plutôt que de rester cassée indéfiniment.
 *
 * `providerOverride` : le provider qui a réellement résolu la compétition
 * (ex. "api-football" quand le composite provider utilise API-Football en
 * repli). Sans override, utilise le provider actif par défaut.
 */
export async function upsertCompetition(
  dto: CompetitionDTO,
  slugOverride?: string,
  providerOverride?: string,
): Promise<Competition> {
  const slug = slugOverride ?? slugify(dto.name);
  const provider = providerOverride ?? PROVIDER_NAME;

  // Recherche par slug (clé unique seule) plutôt que par provider+externalId :
  // quand le provider change (ex. football-data.org → api-football), la clé
  // composée ne trouve pas l'ancien enregistrement et tente un CREATE qui
  // violerait la contrainte unique sur slug. En cherchant par slug d'abord,
  // on met toujours à jour l'enregistrement existant, quel que soit son
  // provider/externalId actuel.
  const existing = await prisma.competition.findUnique({ where: { slug } });
  if (existing) {
    return prisma.competition.update({
      where: { id: existing.id },
      data: {
        provider,
        externalId: dto.externalId,
        name: dto.name,
        type: dto.type,
        logoUrl: dto.logoUrl,
        countryName: dto.countryName,
        countryCode: dto.countryCode,
      },
    });
  }

  return prisma.competition.create({
    data: {
      provider,
      externalId: dto.externalId,
      name: dto.name,
      slug,
      type: dto.type,
      logoUrl: dto.logoUrl,
      countryName: dto.countryName,
      countryCode: dto.countryCode,
    },
  });
}

export async function upsertSeason(dto: SeasonDTO, competitionId: string): Promise<Season> {
  const provider = providerForExternalId(dto.externalId);
  return prisma.season.upsert({
    where: { provider_externalId: { provider, externalId: dto.externalId } },
    create: {
      provider,
      externalId: dto.externalId,
      year: dto.year,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isCurrent: dto.isCurrent,
      competitionId,
    },
    update: {
      year: dto.year,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isCurrent: dto.isCurrent,
    },
  });
}

export async function upsertTeam(dto: TeamDTO): Promise<Team> {
  const provider = providerForExternalId(dto.externalId);
  const existing = await prisma.team.findUnique({
    where: { provider_externalId: { provider, externalId: dto.externalId } },
  });
  if (existing) {
    return prisma.team.update({
      where: { id: existing.id },
      data: {
        name: dto.name,
        shortName: dto.shortName,
        crestUrl: dto.crestUrl,
        foundedYear: dto.foundedYear,
        venueName: dto.venueName,
        venueCity: dto.venueCity,
        countryCode: dto.countryCode,
      },
    });
  }

  // Repli par slug (même nom = même équipe) : une fiche créée jadis sous un
  // autre provider/externalId (ex. "albania" via football-data.org, ID 1065)
  // est réutilisée plutôt que de violer la contrainte unique sur slug.
  // On ne touche JAMAIS à l'identité existante (provider/externalId/slug) :
  // pas de ping-pong entre providers au fil des syncs, pas de fusion
  // destructive — juste les champs descriptifs.
  const slug = slugify(dto.name);
  const sameName = await prisma.team.findUnique({ where: { slug } });
  if (sameName) {
    return prisma.team.update({
      where: { id: sameName.id },
      data: {
        name: dto.name,
        shortName: dto.shortName,
        crestUrl: dto.crestUrl ?? sameName.crestUrl,
        foundedYear: dto.foundedYear ?? sameName.foundedYear,
        venueName: dto.venueName ?? sameName.venueName,
        venueCity: dto.venueCity ?? sameName.venueCity,
        countryCode: dto.countryCode ?? sameName.countryCode,
      },
    });
  }

  return prisma.team.create({
    data: {
      provider,
      externalId: dto.externalId,
      name: dto.name,
      shortName: dto.shortName,
      slug,
      crestUrl: dto.crestUrl,
      foundedYear: dto.foundedYear,
      venueName: dto.venueName,
      venueCity: dto.venueCity,
      countryCode: dto.countryCode,
    },
  });
}

/**
 * `photoUrl` n'est JAMAIS écrasé par une valeur nulle du fournisseur : voir
 * apps/worker/src/jobs/syncPlayerPhotos.ts, qui comble ce que football-data.org
 * (dto.photoUrl toujours null sur ce plan) ne fournit pas — sans ce garde,
 * chaque resync (toutes les 6h, voir syncRosters.ts) effacerait silencieusement
 * les photos backfillées, exactement le bug déjà corrigé une fois pour les
 * événements de match écrasés par syncLiveScores.ts.
 */
export async function upsertPlayer(dto: PlayerDTO): Promise<Player> {
  // Slugs joueurs = displayName + externalId (uniques par construction) : pas
  // de repli par slug nécessaire ici, juste le provider réel (voir
  // providerForExternalId) pour ne pas dupliquer une fiche à chaque provider.
  const provider = providerForExternalId(dto.externalId);
  return prisma.player.upsert({
    where: { provider_externalId: { provider, externalId: dto.externalId } },
    create: {
      provider,
      externalId: dto.externalId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName,
      slug: slugify(dto.displayName + "-" + dto.externalId),
      photoUrl: dto.photoUrl,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      nationality: dto.nationality,
      position: dto.position,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
    },
    update: {
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName,
      ...(dto.photoUrl ? { photoUrl: dto.photoUrl } : {}),
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      nationality: dto.nationality,
      position: dto.position,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
    },
  });
}

export async function findCompetitionByExternalId(externalId: string) {
  return prisma.competition.findUnique({
    where: { provider_externalId: { provider: providerForExternalId(externalId), externalId } },
  });
}

export async function findSeasonByExternalId(externalId: string) {
  return prisma.season.findUnique({
    where: { provider_externalId: { provider: providerForExternalId(externalId), externalId } },
  });
}

export async function findTeamByExternalId(externalId: string) {
  return prisma.team.findUnique({
    where: { provider_externalId: { provider: providerForExternalId(externalId), externalId } },
  });
}

export async function findPlayerByExternalId(externalId: string) {
  return prisma.player.findUnique({
    where: { provider_externalId: { provider: providerForExternalId(externalId), externalId } },
  });
}
