import { notFound } from "next/navigation";
import { getCurrentAdmin, type CurrentAdmin } from "./current-admin";
import { can, type Permission } from "./permissions";

/**
 * Pour les Server Components de pages admin — 404 si le rôle n'a pas la
 * permission requise (le layout parent a déjà géré la redirection si
 * personne n'est connecté du tout ; ceci gère le cas "connecté mais pas
 * autorisé", ex. un Analyste qui tape /admin/news dans la barre d'adresse).
 */
export async function requireAdminPagePermission(permission: Permission): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin || !can(admin.role, permission)) notFound();
  return admin;
}
