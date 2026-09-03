import { prisma } from "@rexfoot/db";
import { FEATURED_COMPETITION_SLUGS } from "@rexfoot/config";

export async function getFeaturedCompetitions() {
  const rows = await prisma.competition.findMany({
    where: { slug: { in: [...FEATURED_COMPETITION_SLUGS] }, isActive: true },
    orderBy: { tier: "asc" },
    select: { id: true, slug: true, name: true, logoUrl: true, countryName: true },
  });
  // Préserve l'ordre éditorial défini par FEATURED_COMPETITION_SLUGS plutôt que l'ordre DB.
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return FEATURED_COMPETITION_SLUGS.map((slug) => bySlug.get(slug)).filter((c) => c !== undefined);
}

export async function getCompetitionBySlug(slug: string) {
  return prisma.competition.findUnique({
    where: { slug },
    include: {
      seasons: { where: { isCurrent: true }, take: 1 },
    },
  });
}

export async function getStandingsForCompetition(competitionId: string, seasonId: string) {
  return prisma.standing.findMany({
    where: { competitionId, seasonId },
    orderBy: [{ groupName: "asc" }, { position: "asc" }],
    include: { team: { select: { name: true, slug: true, crestUrl: true } } },
  });
}

export async function getFixturesForCompetition(competitionId: string, seasonId: string) {
  return prisma.fixture.findMany({
    where: { competitionId, seasonId },
    orderBy: { kickoffAt: "asc" },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
    },
  });
}
