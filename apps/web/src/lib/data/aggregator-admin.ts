import { prisma } from "@rexfoot/db";

/** Toutes les headlines agrégées (tous statuts), sources les plus récentes en premier — pour la file de revue /admin/aggregator. */
export async function getAllHeadlinesForAdmin() {
  return prisma.aggregatedHeadline.findMany({
    orderBy: { firstSeenAt: "desc" },
    include: { sources: { orderBy: { retrievedAt: "desc" } } },
    take: 100,
  });
}
