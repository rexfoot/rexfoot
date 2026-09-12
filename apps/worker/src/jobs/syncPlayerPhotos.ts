import { prisma } from "@rexfoot/db";
import { logger } from "../lib/logger.js";

// Clé "test" publique de TheSportsDB (thesportsdb.com/free_sports_api) par
// défaut — pas de compte requis, mais PARTAGÉE avec tout le reste d'Internet
// utilisant la même clé "3" : le 429 constaté en prod (2026-09-06, ~49% de
// photos manquantes) ne reflète pas notre propre débit, voir searchPlayer.
// THESPORTSDB_API_KEY (clé Patreon payante, débit dédié) prend le relais dès
// qu'elle est définie — aucun autre changement de code nécessaire pour
// upgrader, seulement la variable d'environnement Railway. football-data.org
// (plan gratuit) ne fournit AUCUNE photo de joueur (voir photoUrl: null dans
// packages/football-provider/src/providers/footballDataOrg.ts) ; TheSportsDB
// reste la seule source de photos trouvée, gratuite ou payante.
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${process.env.THESPORTSDB_API_KEY ?? "3"}`;
const MAX_PLAYERS_PER_RUN = 25;
const DELAY_BETWEEN_REQUESTS_MS = 1_500;
// Beaucoup de noms ne correspondent qu'à une fiche TheSportsDB sans aucune
// photo (ex. "_Retired-Soccer", strThumb/strCutout tous deux null) : ce
// joueur reste indéfiniment dans le filtre `photoUrl: null` et, sans le
// tirage aléatoire ci-dessous, un simple `take` sans `orderBy` renvoie le
// même sous-ensemble en tête à chaque run (ordre de scan Postgres stable) —
// ces cas sans issue monopolisaient alors les 25 essais de CHAQUE run,
// empêchant tout le reste de la file d'être ne serait-ce que tenté (bug vécu
// le 2026-09-05 : composition d'un match du jour toujours sans aucune photo
// des heures après le déploiement du ciblage "équipes du jour"). Piocher un
// lot au hasard dans un pool plus large fait tourner l'échantillon d'un run
// à l'autre, donc les cas sans issue ne bloquent plus que statistiquement.
const CANDIDATE_POOL_SIZE = 200;

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

function pickRandomSample<T>(pool: T[], count: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy.slice(0, count);
}

const normalize = (s: string) => s.toLowerCase().trim();
function sameNationality(a: string, b: string): boolean {
  const [na, nb] = [normalize(a), normalize(b)];
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function searchPlayer(name: string): Promise<TheSportsDbPlayer[]> {
  const response = await fetch(`${BASE_URL}/searchplayers.php?p=${encodeURIComponent(name)}`);
  if (!response.ok) {
    // Silencieux jusqu'ici : un run entier pouvait échouer en boucle sur un
    // 429 (clé "3" partagée) sans qu'aucun log ne le distingue d'un simple
    // "aucun résultat" — voir le commentaire de BASE_URL.
    if (response.status === 429) {
      logger.warn({ player: name }, "[TheSportsDB] 429 (quota dépassé) — voir THESPORTSDB_API_KEY");
    }
    return [];
  }
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
 * sur la file générale. Le tirage est aléatoire dans chaque pool (voir
 * pickRandomSample) pour qu'un sous-ensemble sans photo disponible ne
 * monopolise pas indéfiniment les créneaux d'un run à l'autre.
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

  const priorityPool = await prisma.player.findMany({
    where: { photoUrl: null, teamMemberships: { some: { team: teamPlayingTodayFilter } } },
    take: CANDIDATE_POOL_SIZE,
    select: { id: true, displayName: true, nationality: true },
  });

  let players = pickRandomSample(priorityPool, MAX_PLAYERS_PER_RUN);
  if (players.length < MAX_PLAYERS_PER_RUN) {
    const fallbackPool = await prisma.player.findMany({
      where: { photoUrl: null, id: { notIn: players.map((p) => p.id) } },
      take: CANDIDATE_POOL_SIZE,
      select: { id: true, displayName: true, nationality: true },
    });
    players = [...players, ...pickRandomSample(fallbackPool, MAX_PLAYERS_PER_RUN - players.length)];
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
