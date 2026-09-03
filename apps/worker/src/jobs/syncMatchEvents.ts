import { prisma, type FixtureEventType } from "@rexfoot/db";
import { createHighlightlyClientIfConfigured, type HighlightlyEvent } from "@rexfoot/football-provider";
import { logger } from "../lib/logger.js";

// Highlightly (plan gratuit) : 100 requêtes/jour, aucun plafond horaire strict
// documenté. Ce job tourne toutes les SYNC_INTERVAL_MINUTES (voir scheduler.ts)
// et ne traite au plus MAX_MATCHES_PER_RUN matchs en direct par exécution —
// avec l'id Highlightly mis en cache sur Fixture après la première résolution,
// le régime de croisière est 1 requête (événements) par match en direct et par
// cycle, ce qui reste largement sous le quota même à plusieurs matchs simultanés.
const MAX_MATCHES_PER_RUN = 6;

/**
 * Best-effort : un type d'événement Highlightly non reconnu est ignoré (log
 * debug) plutôt que de faire échouer toute la synchro d'un match pour un seul
 * événement — voir aussi FixtureEventType (packages/db/prisma/schema.prisma).
 */
function mapEventType(rawType: string): FixtureEventType | null {
  const type = rawType.toLowerCase();
  if (type.includes("own goal")) return "OWN_GOAL";
  if (type.includes("missed penalty") || type.includes("penalty missed")) return "MISSED_PENALTY";
  if (type.includes("penalty")) return "PENALTY";
  if (type.includes("goal")) return "GOAL";
  if (type.includes("second yellow") || type.includes("red card")) return "RED_CARD";
  if (type.includes("yellow card")) return "YELLOW_CARD";
  if (type.includes("substitution")) return "SUBSTITUTION";
  if (type.includes("var")) return "VAR";
  return null;
}

/** "45+2" -> { minute: 45, extraMinute: 2 } ; "63" -> { minute: 63, extraMinute: null }. */
function parseMinute(time: string): { minute: number; extraMinute: number | null } {
  const [base, extra] = time.split("+");
  const minute = Number.parseInt(base ?? "", 10);
  const extraMinute = extra ? Number.parseInt(extra, 10) : null;
  return { minute: Number.isNaN(minute) ? 0 : minute, extraMinute: Number.isNaN(extraMinute!) ? null : extraMinute };
}

interface MatchTeams {
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
}

/**
 * Remplace tous les événements connus du match par ceux renvoyés par
 * Highlightly (liste complète à jour à chaque appel, jamais un diff
 * incrémental — même stratégie que syncLiveScores.ts pour API-Football).
 * L'équipe est résolue par comparaison de nom (jamais d'id Highlightly côté
 * équipe stocké chez nous) ; le joueur n'est jamais résolu vers notre table
 * Player (aucune correspondance d'id fiable entre fournisseurs) — son nom est
 * stocké tel quel dans `detail`, exactement le champ que l'UI utilise déjà en
 * repli quand `event.player` est absent (voir MatchDetailClient.tsx).
 */
async function replaceFixtureEvents(fixtureId: string, teams: MatchTeams, events: HighlightlyEvent[]): Promise<void> {
  const normalize = (s: string) => s.toLowerCase().trim();
  const homeNorm = normalize(teams.homeTeamName);

  await prisma.fixtureEvent.deleteMany({ where: { fixtureId } });

  for (const event of events) {
    const type = mapEventType(event.type);
    if (!type) {
      logger.debug({ fixtureId, rawType: event.type }, "Événement Highlightly ignoré (type non reconnu)");
      continue;
    }

    const eventTeamNorm = normalize(event.team.name);
    const teamId = eventTeamNorm === homeNorm || homeNorm.includes(eventTeamNorm) || eventTeamNorm.includes(homeNorm)
      ? teams.homeTeamId
      : teams.awayTeamId;

    const { minute, extraMinute } = parseMinute(event.time);
    const detailParts = [event.player, event.substituted ? `→ ${event.substituted}` : null].filter(Boolean);

    await prisma.fixtureEvent.create({
      data: {
        fixtureId,
        type,
        minute,
        extraMinute,
        teamId,
        detail: detailParts.length > 0 ? detailParts.join(" ") : null,
      },
    });
  }
}

export async function syncMatchEvents(): Promise<void> {
  const client = createHighlightlyClientIfConfigured();
  if (!client) {
    logger.info("Aucune clé Highlightly configurée — syncMatchEvents ignoré (pas de fausse donnée générée)");
    return;
  }

  const liveMatches = await prisma.fixture.findMany({
    where: { status: { in: ["LIVE", "HALFTIME"] } },
    orderBy: { kickoffAt: "asc" },
    take: MAX_MATCHES_PER_RUN,
    select: {
      id: true,
      kickoffAt: true,
      highlightlyId: true,
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      competition: { select: { countryName: true } },
    },
  });

  if (liveMatches.length === 0) return;

  for (const match of liveMatches) {
    try {
      let highlightlyId = match.highlightlyId;
      if (!highlightlyId) {
        highlightlyId = await client.findMatchId(
          match.homeTeam.name,
          match.awayTeam.name,
          match.kickoffAt.toISOString(),
          match.competition.countryName,
        );
        if (!highlightlyId) {
          logger.warn({ fixtureId: match.id, home: match.homeTeam.name, away: match.awayTeam.name }, "Match introuvable chez Highlightly, ignoré");
          continue;
        }
        await prisma.fixture.update({ where: { id: match.id }, data: { highlightlyId } });
      }

      const events = await client.getEvents(highlightlyId);
      await replaceFixtureEvents(match.id, {
        homeTeamId: match.homeTeam.id,
        homeTeamName: match.homeTeam.name,
        awayTeamId: match.awayTeam.id,
        awayTeamName: match.awayTeam.name,
      }, events);

      logger.info({ fixtureId: match.id, events: events.length }, "Événements de match synchronisés (Highlightly)");
    } catch (cause) {
      // Une erreur sur un match (id introuvable, quota Highlightly épuisé pour
      // la journée, etc.) ne doit jamais bloquer les autres matchs en direct.
      logger.warn({ fixtureId: match.id, cause }, "Échec de synchro des événements pour ce match, ignoré");
    }
  }
}
