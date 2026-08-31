import { prisma } from "@rexfoot/db";

export async function getPlayerBySlug(slug: string) {
  return prisma.player.findUnique({
    where: { slug },
    include: {
      teamMemberships: {
        orderBy: { joinedAt: "desc" },
        take: 1,
        include: { team: { select: { name: true, slug: true, crestUrl: true } } },
      },
      statistics: {
        take: 10,
        orderBy: { fixture: { kickoffAt: "desc" } },
        include: { fixture: { select: { kickoffAt: true, id: true } } },
      },
    },
  });
}
