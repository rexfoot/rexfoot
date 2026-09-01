import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type UserRole } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";
import { ADMIN_ROLES } from "@/lib/auth/permissions";

const bodySchema = z.object({ role: z.enum(["USER", ...ADMIN_ROLES] as [string, ...string[]]) });

/** Change le rôle d'un compte (y compris le retour à USER = révoquer l'accès admin). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, response } = await requirePermission(request, "manageUsers");
  if (!admin) return response;

  const { id } = await params;
  if (id === admin.id) return apiError(400, "Tu ne peux pas changer ton propre rôle depuis ici.");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Rôle invalide.");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return apiError(404, "Utilisateur introuvable.");

  await prisma.user.update({ where: { id }, data: { role: parsed.data.role as UserRole } });
  return NextResponse.json({ ok: true });
}
