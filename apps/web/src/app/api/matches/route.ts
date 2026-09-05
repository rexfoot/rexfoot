import { NextResponse } from "next/server";
import { z } from "zod";
import { getMatches } from "@/lib/data/matches";
import { enforceRateLimit } from "@/lib/api-response";

const querySchema = z.object({
  date: z.string().datetime().optional(),
  competition: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
});

/** Lit uniquement Postgres (jamais l'API football directement) — alimenté par apps/worker. */
export async function GET(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, "api:matches");
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: searchParams.get("date") ?? undefined,
    competition: searchParams.get("competition") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { matches, hasMore } = await getMatches({
    date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    competitionSlug: parsed.data.competition,
    page: parsed.data.page,
  });

  // Explicite (demandé 2026-09-05) : Cloudflare renvoyait déjà DYNAMIC pour
  // cette route en pratique, mais rien ne l'empêchait de changer d'avis sans
  // ce header — le polling live (useMatchesList.ts) dépend d'une réponse
  // jamais mise en cache par un intermédiaire.
  return NextResponse.json({ matches, hasMore }, { headers: { "Cache-Control": "no-store" } });
}
