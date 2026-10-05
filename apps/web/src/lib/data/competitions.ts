import { prisma } from "@rexfoot/db";
import { FEATURED_COMPETITION_SLUGS } from "@rexfoot/config";

export async function getFeaturedCompetitions() {
  const rows = await prisma.competition.findMany({
    where: { slug: { in: [...FEATURED_COMPETITION_SLUGS] }, isActive: true },
    orderBy: { tier: "asc" },
    select: { id: true, slug: true, name: true, logoUrl: true, countryName: true },
  });
  // Préserve l'ordre éditorial défini par FEATURED_COMPETITION_SLUGS plutôt que l'ordre DB.
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return FEATURED_COMPETITION_SLUGS.map((slug) => bySlug.get(slug)).filter((c) => c !== undefined);
}

export async function getCompetitionBySlug(slug: string) {
  return prisma.competition.findUnique({
    where: { slug },
    include: {
      seasons: { where: { isCurrent: true }, take: 1 },
    },
  });
}

export async function getStandingsForCompetition(competitionId: string, seasonId: string) {
  return prisma.standing.findMany({
    where: { competitionId, seasonId },
    orderBy: [{ groupName: "asc" }, { position: "asc" }],
    include: { team: { select: { name: true, slug: true, crestUrl: true } } },
  });
}

/**
 * La page compétition a-t-elle de vraies données (classement ou calendrier) ?
 * Requêtes COUNT légères (pas de jointures) — sert le noindex automatique des
 * pages vides (voir generateMetadata de competitions/[slug]) : noindex tant
 * que vide, indexable dès que le worker synchronise des données, sans
 * intervention et sans toucher aux URLs.
 */
export async function hasCompetitionData(competitionId: string, seasonId: string): Promise<boolean> {
  const [standings, fixtures] = await Promise.all([
    prisma.standing.count({ where: { competitionId, seasonId } }),
    prisma.fixture.count({ where: { competitionId, seasonId } }),
  ]);
  return standings > 0 || fixtures > 0;
}

export async function getFixturesForCompetition(competitionId: string, seasonId: string) {
  return prisma.fixture.findMany({
    where: { competitionId, seasonId },
    orderBy: { kickoffAt: "asc" },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
      events: {
        select: { id: true, type: true, minute: true, extraMinute: true, teamId: true, detail: true, detailOut: true },
        orderBy: { minute: "asc" },
      },
    },
  });
}
