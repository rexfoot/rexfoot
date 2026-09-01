import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, type MatchVoteChoice } from "@rexfoot/db";
import { apiError, enforceRateLimit } from "@/lib/api-response";
import { VOTER_COOKIE, VOTER_COOKIE_MAX_AGE, generateVoterKey, getVoterKeyFromRequest } from "@/lib/voter";

interface VoteTotals {
  home: number;
  draw: number;
  away: number;
  myChoice: MatchVoteChoice | null;
}

async function getTotals(fixtureId: string, voterKey: string | null): Promise<VoteTotals> {
  const [grouped, mine] = await Promise.all([
    prisma.matchVote.groupBy({ by: ["choice"], where: { fixtureId }, _count: { _all: true } }),
    voterKey
      ? prisma.matchVote.findUnique({ where: { fixtureId_voterKey: { fixtureId, voterKey } } })
      : Promise.resolve(null),
  ]);

  const totals: VoteTotals = { home: 0, draw: 0, away: 0, myChoice: mine?.choice ?? null };
  for (const row of grouped) {
    if (row.choice === "HOME") totals.home = row._count._all;
    if (row.choice === "DRAW") totals.draw = row._count._all;
    if (row.choice === "AWAY") totals.away = row._count._all;
  }
  return totals;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await enforceRateLimit(request, "api:match-votes");
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;
  const voterKey = getVoterKeyFromRequest(request);
  const totals = await getTotals(id, voterKey);
  return NextResponse.json(totals);
}

const bodySchema = z.object({ choice: z.enum(["HOME", "DRAW", "AWAY"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await enforceRateLimit(request, "api:match-votes");
  if (rateLimitResponse) return rateLimitResponse;

  const { id } = await params;
  const fixture = await prisma.fixture.findUnique({ where: { id }, select: { id: true } });
  if (!fixture) return apiError(404, "Match introuvable.");

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Choix de vote invalide.");

  const voterKey = getVoterKeyFromRequest(request) ?? generateVoterKey();

  await prisma.matchVote.upsert({
    where: { fixtureId_voterKey: { fixtureId: id, voterKey } },
    update: { choice: parsed.data.choice },
    create: { fixtureId: id, voterKey, choice: parsed.data.choice },
  });

  const totals = await getTotals(id, voterKey);
  const response = NextResponse.json(totals);
  response.cookies.set(VOTER_COOKIE, voterKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VOTER_COOKIE_MAX_AGE,
  });
  return response;
}
