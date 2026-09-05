import { prisma } from "@rexfoot/db";
import { logger } from "../lib/logger.js";

// Clé "test" publique de TheSportsDB (thesportsdb.com/free_sports_api) — pas
// de compte requis, mais très limitée en débit (documentée autour de 30
// requêtes/minute). football-data.org (plan gratuit) ne fournit AUCUNE photo
// de joueur (voir photoUrl: null dans packages/football-provider/src/providers/footballDataOrg.ts) ;
// c'est la seule source de photos réellement gratuite trouvée. Passer à une
// vraie clé Patreon (débit plus élevé) ne demanderait que de changer ce
// segment d'URL, rien d'autre dans ce fichier.
const BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";
const MAX_PLAYERS_PER_RUN = 25;
const DELAY_BETWEEN_REQUESTS_MS = 1_500;

interface TheSportsDbPlayer {
  strPlayer: string;
  strSport: string;
  strNationality: string | null;
  strThumb: string | null;
  strCutout: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const normalize = (s: string) => s.toLowerCase().trim();
function sameNationality(a: string, b: string): boolean {
  const [na, nb] = [normalize(a), normalize(b)];
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function searchPlayer(name: string): Promise<TheSportsDbPlayer[]> {
  const response = await fetch(`${BASE_URL}/searchplayers.php?p=${encodeURIComponent(name)}`);
  if (!response.ok) return [];
  const body = (await response.json()) as { player: TheSportsDbPlayer[] | null };
  return (body.player ?? []).filter((p) => p.strSport === "Soccer");
}

/**
 * Best-effort : ne choisit une photo QUE si un seul candidat football existe
 * pour ce nom, ou si un candidat a une nationalité compatible — jamais de
 * choix arbitraire entre plusieurs homonymes incertains (mieux vaut rester
 * sans photo qu'afficher la mauvaise personne).
 */
function pickBestMatch(candidates: TheSportsDbPlayer[], nationality: string | null): TheSportsDbPlayer | null {
  if (candidates.length === 1) return candidates[0] ?? null;
  if (!nationality) return null;
  const nationalityMatch = candidates.filter((c) => c.strNationality && sameNationality(c.strNationality, nationality));
  return nationalityMatch.length === 1 ? (nationalityMatch[0] ?? null) : null;
}

/**
 * football-data.org (fournisseur actif) ne renvoie aucune photo de joueur —
 * ce job comble ce manque via TheSportsDB, en réessayant progressivement les
 * joueurs sans photo à chaque run (jamais de photo devinée/inventée : voir
 * pickBestMatch). Débit volontairement lent (délai entre requêtes + lot
 * borné) pour rester sous la limite du plan gratuit TheSportsDB.
 *
 * Priorise les joueurs des équipes qui jouent AUJOURD'HUI (demandé par
 * Hicham le 2026-09-05, après avoir vu la compo sans aucune photo sur un
 * match en direct — la file d'attente générale, sans ordre précis, pouvait
 * mettre des heures à atteindre l'équipe d'un match du jour parmi tous les
 * joueurs sans photo de la base). Le reste du lot, s'il en reste, retombe
 * sur la file générale — jamais bloquant, l'auto-rotation vient du filtre
 * `photoUrl: null` qui se réduit tout seul à mesure que des photos sont trouvées.
 */
export async function syncPlayerPhotos(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const teamPlayingTodayFilter = {
    OR: [
      { homeFixtures: { some: { kickoffAt: { gte: today, lt: tomorrow } } } },
      { awayFixtures: { some: { kickoffAt: { gte: today, lt: tomorrow } } } },
    ],
  };

  const priorityPlayers = await prisma.player.findMany({
    where: { photoUrl: null, teamMemberships: { some: { team: teamPlayingTodayFilter } } },
    take: MAX_PLAYERS_PER_RUN,
    select: { id: true, displayName: true, nationality: true },
  });

  let players = priorityPlayers;
  if (players.length < MAX_PLAYERS_PER_RUN) {
    const fallback = await prisma.player.findMany({
      where: { photoUrl: null, id: { notIn: players.map((p) => p.id) } },
      take: MAX_PLAYERS_PER_RUN - players.length,
      select: { id: true, displayName: true, nationality: true },
    });
    players = [...players, ...fallback];
  }
  if (players.length === 0) return;

  let updated = 0;
  for (const player of players) {
    try {
      const candidates = await searchPlayer(player.displayName);
      const match = pickBestMatch(candidates, player.nationality);
      const photoUrl = match?.strThumb ?? match?.strCutout ?? null;

      if (photoUrl) {
        await prisma.player.update({ where: { id: player.id }, data: { photoUrl } });
        updated += 1;
      }
    } catch (cause) {
      logger.warn({ player: player.displayName, cause }, "Synchro photo joueur : échec, ignoré");
    }
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  logger.info({ considered: players.length, updated }, "Synchro photos joueurs : run terminé");
}
