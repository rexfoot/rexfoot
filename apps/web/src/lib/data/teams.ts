import { prisma } from "@rexfoot/db";

export async function getTeamBySlug(slug: string) {
  return prisma.team.findUnique({
    where: { slug },
    include: {
      playerMemberships: {
        include: { player: true },
        orderBy: { shirtNumber: "asc" },
      },
    },
  });
}

export async function getTeamFixtures(teamId: string) {
  return prisma.fixture.findMany({
    where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
    orderBy: { kickoffAt: "desc" },
    take: 20,
    include: {
      homeTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
      competition: { select: { name: true, slug: true, logoUrl: true } },
      events: {
        select: { id: true, type: true, minute: true, extraMinute: true, teamId: true, detail: true, detailOut: true },
        orderBy: { minute: "asc" },
      },
    },
  });
}

export async function getTeamStanding(teamId: string) {
  return prisma.standing.findFirst({
    where: { teamId },
    orderBy: { updatedAt: "desc" },
    include: { competition: true },
  });
}
