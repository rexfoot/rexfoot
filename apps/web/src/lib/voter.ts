import { randomUUID } from "node:crypto";

export const VOTER_COOKIE = "rf_voter";
export const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

/** Identifiant anonyme pour dédupliquer les votes de match — pas de compte utilisateur en v1. */
export function getVoterKeyFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${VOTER_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export function generateVoterKey(): string {
  return randomUUID();
}
