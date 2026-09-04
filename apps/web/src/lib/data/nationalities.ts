import { prisma } from "@rexfoot/db";
import { canonicalNationality, nationalityFlagUrl, NATIONALITY_ALIASES } from "@/lib/nationality-flags";
import type { LineupPlayer, MatchSummary, NationalityOption, NationalityPlayerEntry } from "@/lib/types";

/** Toutes les orthographes brutes en base qui désignent ce pays canonique (lui-même inclus). */
function rawVariantsFor(canonical: string): string[] {
  const aliases = Object.entries(NATIONALITY_ALIASES)
    .filter(([, target]) => target === canonical)
    .map(([raw]) => raw);
  return [canonical, ...aliases];
}

/**
 * Nationalité "effective" d'un joueur : la correction manuelle
 * (`nationalityOverride`, voir schema.prisma) prime toujours sur celle du
 * fournisseur, qui accuse parfois des mois de retard sur un changement de
 * sélection nationale récent.
 */
function effectiveNationality(player: { nationality: string | null; nationalityOverride: string | null }): string | null {
  return player.nationalityOverride ?? player.nationality;
}

/** Liste des nationalités réellement présentes en base — jamais une liste figée, dérivée des joueurs synchronisés. */
export async function getNationalityOptions(): Promise<NationalityOption[]> {
  const players = await prisma.player.findMany({
    where: { OR: [{ nationality: { not: null } }, { nationalityOverride: { not: null } }] },
    select: { nationality: true, nationalityOverride: true },
  });

  const counts = new Map<string, number>();
  for (const player of players) {
    const raw = effectiveNationality(player);
    if (!raw) continue;
    const canonical = canonicalNationality(raw);
    counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, playerCount]) => ({ name, flagUrl: nationalityFlagUrl(name), playerCount }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const lineupPlayerNameNormalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

function sameLineupPlayer(lineupName: string, displayName: string): boolean {
  const [a, b] = [lineupPlayerNameNormalize(lineupName), lineupPlayerNameNormalize(displayName)];
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Statut titulaire/remplaçant — uniquement si une composition existe déjà pour
 * ce match (jamais avant le coup d'envoi, voir apps/worker/src/jobs/syncMatchEvents.ts)
 * ET si le nom du joueur s'y reconnaît avec confiance. `null` sinon — jamais
 * un statut deviné, l'UI n'affiche simplement pas le badge dans ce cas.
 */
function resolveLineupStatus(
  lineup: { startingXI: unknown; substitutes: unknown } | undefined,
  displayName: string,
): "STARTER" | "SUBSTITUTE" | null {
  if (!lineup) return null;
  const startingXI = lineup.startingXI as unknown as LineupPlayer[];
  const substitutes = lineup.substitutes as unknown as LineupPlayer[];
  if (startingXI.some((p) => sameLineupPlayer(p.name, displayName))) return "STARTER";
  if (substitutes.some((p) => sameLineupPlayer(p.name, displayName))) return "SUBSTITUTE";
  return null;
}

/**
 * Joueurs de cette nationalité dont l'équipe joue le jour donné — sourcé
 * entièrement depuis les données déjà synchronisées (effectifs + calendrier),
 * aucun appel API supplémentaire. Le statut titulaire/remplaçant, quand connu,
 * vient des compositions déjà posées par syncMatchEvents.ts (Highlightly).
 */
export async function getPlayersByNationalityOnDate(nationality: string, date: Date): Promise<NationalityPlayerEntry[]> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const fixtures = await prisma.fixture.findMany({
    where: { kickoffAt: { gte: start, lte: end } },
    orderBy: { kickoffAt: "asc" },
    select: {
      id: true,
      kickoffAt: true,
      status: true,
      minute: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, slug: true, crestUrl: true } },
      competition: { select: { name: true, slug: true, logoUrl: true } },
      lineups: { select: { teamId: true, startingXI: true, substitutes: true } },
    },
  });
  if (fixtures.length === 0) return [];

  const teamIds = Array.from(new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId])));
  const nationalityVariants = rawVariantsFor(nationality);

  const memberships = await prisma.playerTeamMembership.findMany({
    where: {
      teamId: { in: teamIds },
      leftAt: null,
      player: {
        OR: [{ nationality: { in: nationalityVariants } }, { nationalityOverride: { in: nationalityVariants } }],
      },
    },
    select: {
      teamId: true,
      player: { select: { id: true, slug: true, displayName: true, photoUrl: true, position: true } },
    },
  });
  if (memberships.length === 0) return [];

  const membershipsByTeam = new Map<string, typeof memberships>();
  for (const m of memberships) {
    membershipsByTeam.set(m.teamId, [...(membershipsByTeam.get(m.teamId) ?? []), m]);
  }

  const entries: NationalityPlayerEntry[] = [];
  for (const fixture of fixtures) {
    const sides = [
      { teamId: fixture.homeTeamId, team: fixture.homeTeam, opponent: fixture.awayTeam, isHome: true },
      { teamId: fixture.awayTeamId, team: fixture.awayTeam, opponent: fixture.homeTeam, isHome: false },
    ];

    for (const { teamId, team, opponent, isHome } of sides) {
      const teamMemberships = membershipsByTeam.get(teamId);
      if (!teamMemberships) continue;

      const lineup = fixture.lineups.find((l) => l.teamId === teamId);
      const match: MatchSummary = {
        id: fixture.id,
        kickoffAt: fixture.kickoffAt.toISOString(),
        status: fixture.status,
        minute: fixture.minute,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        competition: fixture.competition,
        // Non chargé ici (cette page n'affiche pas de badge d'événement) —
        // voir matchSelect dans lib/data/matches.ts pour la version complète.
        events: [],
      };

      for (const { player } of teamMemberships) {
        entries.push({
          player,
          team,
          opponent,
          isHome,
          match,
          lineupStatus: resolveLineupStatus(lineup, player.displayName),
        });
      }
    }
  }

  return entries.sort((a, b) => a.match.kickoffAt.localeCompare(b.match.kickoffAt));
}
