import { prisma, Prisma } from "@rexfoot/db";
import { PAGE_SIZE_MATCHES } from "@rexfoot/config";
import { getStandingsForCompetition } from "./competitions";
import type { LineupPlayer, MatchDetail, MatchSummary, StandingRow } from "@/lib/types";

const matchSelect = {
  id: true,
  kickoffAt: true,
  status: true,
  minute: true,
  homeScore: true,
  awayScore: true,
  homeTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
  awayTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
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
  competitionId: true,
  seasonId: true,
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
      expectedGoals: true,
      bigChancesCreated: true,
    },
  },
  lineups: {
    select: {
      teamId: true,
      formation: true,
      startingXI: true,
      substitutes: true,
    },
  },
} as const;

/** Premier match à venir de l'équipe après `after` — null s'il n'y en a aucun de programmé. */
async function getNextFixtureForTeam(teamId: string, after: Date): Promise<MatchSummary | null> {
  const row = await prisma.fixture.findFirst({
    where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }], kickoffAt: { gt: after }, status: "SCHEDULED" },
    orderBy: { kickoffAt: "asc" },
    select: matchSelect,
  });
  return row ? serialize(row) : null;
}

export async function getMatchById(id: string): Promise<MatchDetail | null> {
  const row = await prisma.fixture.findUnique({ where: { id }, select: matchDetailSelect });
  if (!row) return null;

  const [standingsRows, homeTeamNextMatch, awayTeamNextMatch] = await Promise.all([
    getStandingsForCompetition(row.competitionId, row.seasonId),
    getNextFixtureForTeam(row.homeTeam.id, row.kickoffAt),
    getNextFixtureForTeam(row.awayTeam.id, row.kickoffAt),
  ]);

  const standings: StandingRow[] = standingsRows.map((s) => ({
    position: s.position,
    played: s.played,
    won: s.won,
    drawn: s.drawn,
    lost: s.lost,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    goalDifference: s.goalDifference,
    points: s.points,
    form: s.form,
    team: s.team,
  }));

  return {
    ...row,
    kickoffAt: row.kickoffAt.toISOString(),
    lineups: row.lineups.map((l) => ({
      ...l,
      startingXI: l.startingXI as unknown as LineupPlayer[],
      substitutes: l.substitutes as unknown as LineupPlayer[],
    })),
    standings,
    homeTeamNextMatch,
    awayTeamNextMatch,
  };
}

export async function getLiveMatchIds(): Promise<string[]> {
  const rows = await prisma.fixture.findMany({
    where: { status: { in: ["LIVE", "HALFTIME"] } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
