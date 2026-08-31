import { NextResponse } from "next/server";
import { getMatchById } from "@/lib/data/matches";
import { enforceRateLimit, apiError } from "@/lib/api-response";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await enforceRateLimit(request, "api:match-detail");
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;
  const match = await getMatchById(id);
  if (!match) return apiError(404, "Match introuvable");

  return NextResponse.json({ match });
}
