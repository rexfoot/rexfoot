import { prisma } from "@rexfoot/db";

export async function getAllTransfersForAdmin() {
  return prisma.transfer.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getTransferByIdForAdmin(id: string) {
  return prisma.transfer.findUnique({ where: { id } });
}
