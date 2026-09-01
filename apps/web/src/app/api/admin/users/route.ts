import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type UserRole } from "@rexfoot/db";
import { requirePermission, apiError } from "@/lib/api-response";
import { ADMIN_ROLES } from "@/lib/auth/permissions";

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(ADMIN_ROLES as [string, ...string[]]),
});

/** Donne un rôle admin à un compte existant — la personne doit déjà s'être inscrite via /signup. */
export async function POST(request: Request) {
  const { admin, response } = await requirePermission(request, "manageUsers");
  if (!admin) return response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Email ou rôle invalide.");

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) {
    return apiError(404, "Aucun compte avec cet email. La personne doit d'abord créer un compte sur le site (/signup).");
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: parsed.data.role as UserRole } });
  return NextResponse.json({ ok: true });
}
