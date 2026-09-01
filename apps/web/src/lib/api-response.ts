import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "./rate-limit";
import { getCurrentAdminFromRequest, type CurrentAdmin } from "./auth/current-admin";
import { getCurrentUserFromRequest, type CurrentUser } from "./auth/current-user";
import { can, type Permission } from "./auth/permissions";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Garde d'accès pour les routes `/api/admin/*` — renvoie l'admin courant (quel que soit son rôle) ou une réponse 401. */
export async function requireAdmin(
  request: Request,
): Promise<{ admin: CurrentAdmin; response: null } | { admin: null; response: NextResponse }> {
  const admin = await getCurrentAdminFromRequest(request);
  if (!admin) {
    return { admin: null, response: apiError(401, "Authentification requise.") };
  }
  return { admin, response: null };
}

/** Comme requireAdmin, mais exige en plus une permission précise (403 sinon) — voir lib/auth/permissions.ts. */
export async function requirePermission(
  request: Request,
  permission: Permission,
): Promise<{ admin: CurrentAdmin; response: null } | { admin: null; response: NextResponse }> {
  const result = await requireAdmin(request);
  if (!result.admin) return result;
  if (!can(result.admin.role, permission)) {
    return { admin: null, response: apiError(403, "Tu n'as pas la permission d'effectuer cette action.") };
  }
  return result;
}

/** Garde d'accès pour les routes publiques nécessitant un compte connecté (favoris…). */
export async function requireUser(
  request: Request,
): Promise<{ user: CurrentUser; response: null } | { user: null; response: NextResponse }> {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return { user: null, response: apiError(401, "Connexion requise.") };
  }
  return { user, response: null };
}

/** Applique le rate limiting d'une route API publique ; renvoie une réponse 429 si dépassé, sinon `null`. */
export async function enforceRateLimit(request: Request, routeName: string): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const result = await rateLimit(`${routeName}:${ip}`);
  if (!result.allowed) {
    return apiError(429, "Trop de requêtes, réessaie dans un instant.");
  }
  return null;
}
