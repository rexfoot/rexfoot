import { prisma } from "@rexfoot/db";
import type { TransferStatus } from "@rexfoot/db";

/** Transferts publiés, plus récents d'abord — jamais un brouillon (publishedAt null) côté public. */
export async function getPublishedTransfers(status?: TransferStatus, limit = 30) {
  return prisma.transfer.findMany({
    where: { publishedAt: { not: null }, ...(status ? { status } : {}) },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}
