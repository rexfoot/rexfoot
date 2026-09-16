import { prisma } from "@rexfoot/db";
import { createApiFootballProviderIfConfigured, type ApiFootballProvider } from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";
import { runAgentTask } from "../lib/agentTask.js";

// Même garde-fou que LOOKUP_RETRY_COOLDOWN_MS dans syncMatchEvents.ts (pour
// Highlightly) : une compétition qu'API-Football ne référence pas (ou dont le
// plan souscrit ne couvre pas /leagues ou /injuries) ne doit pas être
// re-recherchée à chaque cycle de 6h pour rien. 7 jours car, contrairement à
// un match en direct, une compétition ne "devient" pas résolvable du jour au
// lendemain — inutile de retenter souvent.
const COMPETITION_RESOLUTION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Compare deux noms malgré des conventions différentes entre fournisseurs
 * (accents, casse, ponctuation) — même principe que sameTeamName dans
 * highlightly.ts, mais sans la liste de stopwords spécifique aux clubs (les
 * noms de compétitions et de joueurs n'ont pas ce bruit corporate). Best-effort
 * documenté : peut échouer sur des cas tordus (ex. joueur avec un seul prénom
 * d'usage chez un fournisseur), auquel cas la blessure est simplement ignorée
 * plutôt que mal attribuée — jamais de correspondance approximative risquée.
 */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[-.']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looseNameMatch(a: string, b: string): boolean {
  const [na, nb] = [normalizeName(a), normalizeName(b)];
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/**
 * Résout Competition.apiFootballId par nom+pays — une seule fois par
 * compétition, cache permanent ensuite (voir schema.prisma). Retourne `null`
 * si non résolu (plan API-Football sans accès à /leagues, ou compétition
 * absente chez ce fournisseur) : l'appelant doit alors ignorer cette
 * compétition pour ce cycle, jamais supposer une erreur transitoire.
 */
async function resolveCompetitionId(
  provider: ApiFootballProvider,
  competition: { id: string; name: string; countryCode: string | null; apiFootballId: number | null },
): Promise<number | null> {
  if (competition.apiFootballId !== null) return competition.apiFootballId;

  let candidates: Awaited<ReturnType<ApiFootballProvider["getCompetitions"]>> = [];
  try {
    candidates = await provider.getCompetitions(
      competition.countryCode ? { countryCode: competition.countryCode } : {},
    );
  } catch (error) {
    logger.warn(
      { competition: competition.name, error: (error as Error).message },
      "Blessures : échec résolution compétition API-Football",
    );
  }

  const match = candidates.find((c) => looseNameMatch(c.name, competition.name));
  await prisma.competition.update({
    where: { id: competition.id },
    data: { apiFootballId: match ? Number(match.externalId) : null, apiFootballLookupAttemptedAt: new Date() },
  });

  return match ? Number(match.externalId) : null;
}

/** Résout Team.apiFootballId pour toute équipe encore non résolue de cette compétition — un seul appel getTeams pour toutes, jamais un par équipe. */
async function resolveTeamIds(
  provider: ApiFootballProvider,
  apiFootballLeagueId: number,
  seasonYear: string,
  teams: { id: string; name: string; apiFootballId: number | null }[],
): Promise<void> {
  const unresolved = teams.filter((t) => t.apiFootballId === null);
  if (unresolved.length === 0) return;

  let candidates: Awaited<ReturnType<ApiFootballProvider["getTeams"]>> = [];
  try {
    candidates = await provider.getTeams({
      competitionExternalId: String(apiFootballLeagueId),
      seasonExternalId: seasonYear,
    });
  } catch (error) {
    logger.warn({ apiFootballLeagueId, error: (error as Error).message }, "Blessures : échec résolution équipes API-Football");
    return;
  }

  for (const team of unresolved) {
    const match = candidates.find((c) => looseNameMatch(c.name, team.name));
    if (!match) continue;
    await prisma.team
      .update({ where: { id: team.id }, data: { apiFootballId: Number(match.externalId) } })
      .catch(() => {
        // Collision improbable (deux Team locaux matchant le même apiFootballId) — ignorée, pas critique pour une donnée d'enrichissement.
      });
    team.apiFootballId = Number(match.externalId);
  }
}

/**
 * Blessures/suspensions — désactivé proprement (pas d'erreur) si RAPIDAPI_KEY
 * n'est pas configurée. Le vrai risque ici n'est pas le quota mais la
 * correspondance d'ID entre fournisseurs (Competition/Team/Player.externalId
 * appartiennent au fournisseur ACTIF, pas à API-Football) — voir
 * resolveCompetitionId/resolveTeamIds et Player.apiFootballId. Si le plan
 * API-Football souscrit ne couvre pas /injuries, chaque appel échoue proprement
 * (voir getInjuries dans apiFootball.ts) et cette compétition est simplement
 * ignorée pour ce cycle, sans jamais faire échouer tout le job.
 */
export async function syncInjuries(): Promise<void> {
  const provider = createApiFootballProviderIfConfigured();
  if (!provider) {
    logger.info("Blessures/suspensions : RAPIDAPI_KEY non configurée, run ignoré");
    return;
  }

  const cooldownCutoff = new Date(Date.now() - COMPETITION_RESOLUTION_COOLDOWN_MS);
  const competitions = await prisma.competition.findMany({
    where: {
      isActive: true,
      OR: [
        { apiFootballId: { not: null } },
        { apiFootballLookupAttemptedAt: null },
        { apiFootballLookupAttemptedAt: { lt: cooldownCutoff } },
      ],
    },
    include: { seasons: { where: { isCurrent: true }, take: 1 } },
  });

  let synced = 0;

  for (const competition of competitions) {
    const season = competition.seasons[0];
    if (!season) continue;

    const leagueId = await resolveCompetitionId(provider, competition);
    if (leagueId === null) continue;

    let injuries;
    try {
      injuries = await provider.getInjuries({ leagueExternalId: String(leagueId), seasonExternalId: season.year });
    } catch (error) {
      logger.warn(
        { competition: competition.slug, error: (error as Error).message },
        "Blessures : échec /injuries pour cette compétition, ignorée ce cycle",
      );
      continue;
    }

    const teams = await prisma.team.findMany({
      where: { competitionSeasons: { some: { competitionId: competition.id, seasonId: season.id } } },
      select: {
        id: true,
        name: true,
        apiFootballId: true,
        playerMemberships: {
          where: { seasonId: season.id },
          select: { player: { select: { id: true, displayName: true, apiFootballId: true } } },
        },
      },
    });
    await resolveTeamIds(provider, leagueId, season.year, teams);

    const stillInjuredPlayerIds = new Set<string>();

    for (const injury of injuries) {
      const team = teams.find((t) => t.apiFootballId === Number(injury.teamExternalId));
      if (!team) continue;

      const roster = team.playerMemberships.map((m) => m.player);
      const player =
        roster.find((p) => p.apiFootballId === Number(injury.playerExternalId)) ??
        roster.find((p) => looseNameMatch(p.displayName, injury.playerName));
      if (!player) continue;

      stillInjuredPlayerIds.add(player.id);

      if (player.apiFootballId === null) {
        await prisma.player
          .update({ where: { id: player.id }, data: { apiFootballId: Number(injury.playerExternalId) } })
          .catch(() => {});
      }

      const externalId = injury.fixtureExternalId ?? injury.playerExternalId;
      const ok = await runAgentTask({
        entityType: "PLAYER",
        entityId: player.id,
        taskType: "SYNC_INJURY",
        fn: async () => {
          await prisma.playerInjuryStatus.upsert({
            where: { playerId_source_externalId: { playerId: player.id, source: "api-football", externalId } },
            create: {
              playerId: player.id,
              teamId: team.id,
              type: injury.type,
              reason: injury.reason,
              status: injury.type === "SUSPENSION" ? "SUSPENDED" : "OUT",
              startDate: new Date(),
              source: "api-football",
              externalId,
            },
            update: {
              teamId: team.id,
              type: injury.type,
              reason: injury.reason,
              status: injury.type === "SUSPENSION" ? "SUSPENDED" : "OUT",
            },
          });
        },
      });
      if (ok) synced += 1;
    }

    // Même principe que Fixture.finalScoreConfirmedAt/finalEventsConfirmedAt :
    // un statut existant n'est jamais laissé figé indéfiniment. Un joueur de
    // cette équipe encore marqué OUT/SUSPENDED en base mais absent de la
    // réponse /injuries de ce cycle est considéré rétabli — sans ça, un joueur
    // resterait affiché blessé pour toujours après son retour.
    const rosterPlayerIds = teams.flatMap((t) => t.playerMemberships.map((m) => m.player.id));
    const staleStatuses = await prisma.playerInjuryStatus.findMany({
      where: {
        playerId: { in: rosterPlayerIds, notIn: [...stillInjuredPlayerIds] },
        source: "api-football",
        resolvedAt: null,
      },
      select: { id: true },
    });
    if (staleStatuses.length > 0) {
      await prisma.playerInjuryStatus.updateMany({
        where: { id: { in: staleStatuses.map((s) => s.id) } },
        data: { status: "AVAILABLE", resolvedAt: new Date() },
      });
    }
  }

  logger.info({ competitionsChecked: competitions.length, synced }, "Blessures/suspensions : run terminé");
}
