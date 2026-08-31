import { prisma, type Competition, type Player, type Season, type Team } from "@rexfoot/db";
import type { CompetitionDTO, PlayerDTO, SeasonDTO, TeamDTO } from "@rexfoot/football-provider";
import { slugify } from "./slugify.js";

const PROVIDER_NAME = "api-football";

export async function upsertCompetition(dto: CompetitionDTO): Promise<Competition> {
  return prisma.competition.upsert({
    where: { provider_externalId: { provider: PROVIDER_NAME, externalId: dto.externalId } },
    create: {
      provider: PROVIDER_NAME,
      externalId: dto.externalId,
      name: dto.name,
      slug: slugify(dto.name),
      type: dto.type,
      logoUrl: dto.logoUrl,
      countryName: dto.countryName,
      countryCode: dto.countryCode,
    },
    update: {
      name: dto.name,
      type: dto.type,
      logoUrl: dto.logoUrl,
      countryName: dto.countryName,
      countryCode: dto.countryCode,
    },
  });
}

export async function upsertSeason(dto: SeasonDTO, competitionId: string): Promise<Season> {
  return prisma.season.upsert({
    where: { provider_externalId: { provider: PROVIDER_NAME, externalId: dto.externalId } },
    create: {
      provider: PROVIDER_NAME,
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
  return prisma.team.upsert({
    where: { provider_externalId: { provider: PROVIDER_NAME, externalId: dto.externalId } },
    create: {
      provider: PROVIDER_NAME,
      externalId: dto.externalId,
      name: dto.name,
      shortName: dto.shortName,
      slug: slugify(dto.name),
      crestUrl: dto.crestUrl,
      foundedYear: dto.foundedYear,
      venueName: dto.venueName,
      venueCity: dto.venueCity,
      countryCode: dto.countryCode,
    },
    update: {
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

export async function upsertPlayer(dto: PlayerDTO): Promise<Player> {
  return prisma.player.upsert({
    where: { provider_externalId: { provider: PROVIDER_NAME, externalId: dto.externalId } },
    create: {
      provider: PROVIDER_NAME,
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
      photoUrl: dto.photoUrl,
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
    where: { provider_externalId: { provider: PROVIDER_NAME, externalId } },
  });
}

export async function findSeasonByExternalId(externalId: string) {
  return prisma.season.findUnique({
    where: { provider_externalId: { provider: PROVIDER_NAME, externalId } },
  });
}

export async function findTeamByExternalId(externalId: string) {
  return prisma.team.findUnique({
    where: { provider_externalId: { provider: PROVIDER_NAME, externalId } },
  });
}

export async function findPlayerByExternalId(externalId: string) {
  return prisma.player.findUnique({
    where: { provider_externalId: { provider: PROVIDER_NAME, externalId } },
  });
}
