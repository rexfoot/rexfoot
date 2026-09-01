import { prisma } from "@rexfoot/db";
import { ADMIN_ROLES } from "@/lib/auth/permissions";

/** Tous les comptes ayant un rôle admin (Super Admin, Éditeur, Journaliste, Modérateur, Analyste). */
export async function getAdminUsers() {
  return prisma.user.findMany({
    where: { role: { in: ADMIN_ROLES } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, displayName: true, role: true, status: true, createdAt: true },
  });
}
