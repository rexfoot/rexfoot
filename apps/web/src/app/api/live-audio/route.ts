import { NextResponse } from "next/server";
import { getLiveAudioStatus } from "@/lib/data/live-audio";
import { enforceRateLimit } from "@/lib/api-response";

/** Poll public léger (pages match) — pas de contenu sensible, juste un booléen. */
export async function GET(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:live-audio");
  if (rateLimitResponse) return rateLimitResponse;

  const isLive = await getLiveAudioStatus();
  return NextResponse.json({ isLive }, { headers: { "Cache-Control": "no-store" } });
}
