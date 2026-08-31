import { prisma, Prisma } from "@rexfoot/db";
import { PAGE_SIZE_MATCHES } from "@rexfoot/config";
import type { MatchDetail, MatchSummary } from "@/lib/types";

const matchSelect = {
  id: true,
  kickoffAt: true,
  status: true,
  minute: true,
  homeScore: true,
  awayScore: true,
  homeTeam: { select: { name: true, slug: true, crestUrl: true } },
  awayTeam: { select: { name: true, slug: true, crestUrl: true } },
  competition: { select: { name: true, slug: true, logoUrl: true } },
} as const;

function serialize(row: {
  id: string;
  kickoffAt: Date;
  status: MatchSummary["status"];
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: MatchSummary["homeTeam"];
  awayTeam: MatchSummary["awayTeam"];
  competition: MatchSummary["competition"];
}): MatchSummary {
  return { ...row, kickoffAt: row.kickoffAt.toISOString() };
}

/** Matchs du jour (aujourd'hui, toutes compétitions confondues), triés par heure de coup d'envoi. */
export async function getMatchesOfTheDay(): Promise<MatchSummary[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const rows = await prisma.fixture.findMany({
    where: { kickoffAt: { gte: start, lte: end } },
    orderBy: { kickoffAt: "asc" },
    select: matchSelect,
    take: PAGE_SIZE_MATCHES,
  });
  return rows.map(serialize);
}

export interface GetMatchesParams {
  date?: Date;
  competitionSlug?: string;
  page?: number;
}

export async function getMatches({ date, competitionSlug, page = 1 }: GetMatchesParams = {}): Promise<{
  matches: MatchSummary[];
  hasMore: boolean;
}> {
  const where: Prisma.FixtureWhereInput = {};

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.kickoffAt = { gte: start, lte: end };
  }
  if (competitionSlug) {
    where.competition = { slug: competitionSlug };
  }

  const take = PAGE_SIZE_MATCHES;
  const rows = await prisma.fixture.findMany({
    where,
    orderBy: { kickoffAt: "asc" },
    select: matchSelect,
    take: take + 1,
    skip: (page - 1) * take,
  });

  return { matches: rows.slice(0, take).map(serialize), hasMore: rows.length > take };
}

const matchDetailSelect = {
  ...matchSelect,
  round: true,
  venueName: true,
  referee: true,
  events: {
    orderBy: { minute: "asc" as const },
    select: {
      id: true,
      type: true,
      minute: true,
      extraMinute: true,
      detail: true,
      team: { select: { name: true, slug: true, crestUrl: true } },
      player: { select: { displayName: true, slug: true } },
      assistPlayer: { select: { displayName: true, slug: true } },
    },
  },
  teamStatistics: {
    select: {
      teamId: true,
      possession: true,
      shotsTotal: true,
      shotsOnTarget: true,
      corners: true,
      fouls: true,
      offsides: true,
      yellowCards: true,
      redCards: true,
    },
  },
} as const;

export async function getMatchById(id: string): Promise<MatchDetail | null> {
  const row = await prisma.fixture.findUnique({ where: { id }, select: matchDetailSelect });
  if (!row) return null;
  return { ...row, kickoffAt: row.kickoffAt.toISOString() };
}

export async function getLiveMatchIds(): Promise<string[]> {
  const rows = await prisma.fixture.findMany({
    where: { status: { in: ["LIVE", "HALFTIME"] } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
