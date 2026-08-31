import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "./rate-limit";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
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
