import { BREAKING_NEWS_WINDOW_HOURS } from "@rexfoot/config";

/** Un article isBreaking=true ne reste "actif" que BREAKING_NEWS_WINDOW_HOURS après avoir été marqué comme tel. */
export function isCurrentlyBreaking(isBreaking: boolean, breakingSince: Date | null): boolean {
  if (!isBreaking || !breakingSince) return false;
  const ageMs = Date.now() - breakingSince.getTime();
  return ageMs < BREAKING_NEWS_WINDOW_HOURS * 60 * 60 * 1000;
}
