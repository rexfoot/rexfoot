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
  // Vide pour un match SCHEDULED (rien à joindre) — coût négligeable pour les
  // matchs LIVE/FINISHED, alimente les badges but/carton/remplacement sur
  // MatchCard.tsx.
  events: {
    select: { id: true, type: true, minute: true, extraMinute: true, teamId: true, detail: true, detailOut: true },
    orderBy: { minute: "asc" },
  },
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
  events: MatchSummary["events"];
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
  teamSlug?: string;
  page?: number;
}

/**
 * `teamSlug` (demandé 2026-09-05) — sert la page équipe (teams/[slug]) via
 * MatchesListClient au lieu d'un simple map() server-side sans polling : un
 * match affiché là restait bloqué EN DIRECT/à l'ancien score jusqu'à
 * `revalidate` (1h, voir teams/[slug]/page.tsx) même largement terminé
 * entre-temps, faute de tout mécanisme de rafraîchissement côté client.
 */
export async function getMatches({ date, competitionSlug, teamSlug, page = 1 }: GetMatchesParams = {}): Promise<{
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
  if (teamSlug) {
    where.OR = [{ homeTeam: { slug: teamSlug } }, { awayTeam: { slug: teamSlug } }];
  }

  const take = PAGE_SIZE_MATCHES;
  const rows = await prisma.fixture.findMany({
    where,
    // Page équipe : les matchs les plus récents (passés/en cours) d'abord,
    // même tri que l'ancien getTeamFixtures() qu'elle remplace.
    orderBy: { kickoffAt: teamSlug ? "desc" : "asc" },
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
  // Résumés liés (modérés + publiés) pour le bloc "Où regarder" gratuit de la
  // page match — vide la plupart du temps (peu de vidéos liées), coût négligeable.
  relatedVideos: {
    where: { moderationStatus: "APPROVED", publishedAt: { not: null } },
    select: {
      id: true,
      slug: true,
      title: true,
      thumbnailUrl: true,
      durationSeconds: true,
      viewCount: true,
      status: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 4,
  },
} as const;

function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
}

/**
 * Résout la photo de chaque joueur d'une composition en la comparant (nom
 * normalisé, accents/ponctuation retirés) aux joueurs de CETTE équipe dans
 * notre table Player — Lineup vient de Highlightly (jamais lié à Player,
 * voir syncMatchEvents.ts), Player.photoUrl vient de TheSportsDB (voir
 * syncPlayerPhotos.ts) : deux fournisseurs différents, correspondance par
 * nom seulement. Correspondance exacte d'abord ; à défaut, une inclusion
 * dans un sens ou l'autre (même principe que `sameTeam` dans
 * syncMatchEvents.ts) pour absorber les variantes ("David de Gea" vs "de
 * Gea") — jamais risqué au-delà de l'effectif d'UNE équipe, donc peu de
 * chance de confondre deux joueurs différents.
 */
async function resolveLineupPhotos(teamId: string, players: LineupPlayer[]): Promise<LineupPlayer[]> {
  if (players.length === 0) return players;

  const roster = await prisma.player.findMany({
    where: { teamMemberships: { some: { teamId } } },
    select: { displayName: true, photoUrl: true },
  });
  const normalizedRoster = roster
    .filter((r) => r.photoUrl !== null)
    .map((r) => ({ normalized: normalizePlayerName(r.displayName), photoUrl: r.photoUrl! }));

  return players.map((player) => {
    const normalizedName = normalizePlayerName(player.name);
    const exact = normalizedRoster.find((r) => r.normalized === normalizedName);
    if (exact) return { ...player, photoUrl: exact.photoUrl };

    const partial = normalizedRoster.find(
      (r) => r.normalized.includes(normalizedName) || normalizedName.includes(r.normalized),
    );
    return { ...player, photoUrl: partial?.photoUrl ?? null };
  });
}

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
    previousPosition: s.previousPosition,
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

  const lineups = await Promise.all(
    row.lineups.map(async (l) => ({
      ...l,
      startingXI: await resolveLineupPhotos(l.teamId, l.startingXI as unknown as LineupPlayer[]),
      substitutes: await resolveLineupPhotos(l.teamId, l.substitutes as unknown as LineupPlayer[]),
    })),
  );

  return {
    ...row,
    kickoffAt: row.kickoffAt.toISOString(),
    lineups,
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

const lightSelect = {
  id: true,
  kickoffAt: true,
  status: true,
  minute: true,
  homeScore: true,
  awayScore: true,
  homeTeam: { select: { name: true } },
  awayTeam: { select: { name: true } },
  competition: { select: { name: true } },
} as const;

export interface LightMatch {
  id: string;
  kickoffAt: string;
  status: MatchSummary["status"];
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
  competition: { name: string };
}

/**
 * Données ultra-légères pour la page /light (texte seul, petits forfaits) :
 * 3 requêtes simples, sans images ni jointures lourdes — le strict minimum
 * pour suivre les scores.
 */
export async function getLightMatches(): Promise<{ live: LightMatch[]; upcoming: LightMatch[]; results: LightMatch[] }> {
  const serialize = (row: Omit<LightMatch, "kickoffAt"> & { kickoffAt: Date }): LightMatch => ({
    ...row,
    kickoffAt: row.kickoffAt.toISOString(),
  });
  const [live, upcoming, results] = await Promise.all([
    prisma.fixture.findMany({
      where: { status: { in: ["LIVE", "HALFTIME"] } },
      orderBy: { kickoffAt: "asc" },
      select: lightSelect,
    }),
    prisma.fixture.findMany({
      where: { status: "SCHEDULED", kickoffAt: { gte: new Date() } },
      orderBy: { kickoffAt: "asc" },
      take: 15,
      select: lightSelect,
    }),
    prisma.fixture.findMany({
      where: { status: "FINISHED" },
      orderBy: { kickoffAt: "desc" },
      take: 10,
      select: lightSelect,
    }),
  ]);
  return { live: live.map(serialize), upcoming: upcoming.map(serialize), results: results.map(serialize) };
}
