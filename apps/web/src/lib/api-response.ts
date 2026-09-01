import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "./rate-limit";
import { getCurrentAdminFromRequest, type CurrentAdmin } from "./auth/current-admin";
import { getCurrentUserFromRequest, type CurrentUser } from "./auth/current-user";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Garde d'accès pour les routes `/api/admin/*` — renvoie l'admin courant ou une réponse 401 à propager. */
export async function requireAdmin(
  request: Request,
): Promise<{ admin: CurrentAdmin; response: null } | { admin: null; response: NextResponse }> {
  const admin = await getCurrentAdminFromRequest(request);
  if (!admin) {
    return { admin: null, response: apiError(401, "Authentification requise.") };
  }
  return { admin, response: null };
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
