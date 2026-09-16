import { prisma } from "@rexfoot/db";

/** Headlines publiées (revue humaine faite), les plus récentes en premier — voir /admin/aggregator pour la file de revue. */
export async function getPublishedHeadlines(limit = 40) {
  return prisma.aggregatedHeadline.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { firstSeenAt: "desc" },
    include: { sources: { orderBy: { retrievedAt: "asc" } } },
    take: limit,
  });
}
