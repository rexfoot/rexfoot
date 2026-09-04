import { Queue } from "bullmq";
import { createBullMqConnection } from "./lib/redis.js";

export const SYNC_QUEUE_NAME = "rexfoot-sync";

export const JobName = {
  syncFixtures: "sync-fixtures",
  syncLiveScores: "sync-live-scores",
  syncStandings: "sync-standings",
  syncPlayerStats: "sync-player-stats",
  syncRosters: "sync-rosters",
  editorialDigest: "editorial-digest",
  extractTransfers: "extract-transfers",
  syncPlayerPhotos: "sync-player-photos",
  syncYoutubeVideos: "sync-youtube-videos",
  weeklyRecap: "weekly-recap",
  syncMatchEvents: "sync-match-events",
} as const;

// Le fournisseur actif est football-data.org (plan gratuit) : 10 requêtes/MINUTE,
// aucun plafond quotidien — voir MAX_REQUESTS_PER_WINDOW dans footballDataOrg.ts.
// (L'ancien commentaire ici citait le budget quotidien d'API-Football, un
// fournisseur qui n'est plus actif — ne s'applique plus.) Avec cette marge,
// un cycle "idle" toutes les 3 min coûte au pire ~480 requêtes/jour à lui
// seul, largement sous la limite par minute une fois réparti dans le temps.
// Corrige le bug où un match qui vient de démarrer pouvait rester affiché
// "SCHEDULED" jusqu'à 1h après son coup d'envoi, faute de vérification.
const LIVE_SCORES_INTERVAL_DURING_MATCHES_MS = 90 * 1000;
const LIVE_SCORES_INTERVAL_IDLE_MS = 3 * 60 * 1000;

export function createSyncQueue(): Queue {
  return new Queue(SYNC_QUEUE_NAME, { connection: createBullMqConnection() });
}

/**
 * BullMQ identifie un job répétable par son `jobId` COMBINÉ à ses options de
 * répétition (`every`/`pattern`) — changer l'intervalle entre deux déploiements
 * sans retirer l'ancien enregistrement laisse les deux tourner en parallèle
 * indéfiniment ("job fantôme"). On purge donc tous les répétables existants
 * à chaque démarrage avant de réenregistrer la config actuelle, pour que
 * changer un intervalle dans le code soit toujours pris en compte proprement.
 */
async function removeAllRepeatableJobs(queue: Queue): Promise<void> {
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }
}

const DEFAULT_JOB_OPTS = { removeOnComplete: { count: 20 }, removeOnFail: { count: 50 } };

/**
 * Enregistre les jobs répétables à cadence fixe (fixtures, classements,
 * stats) et amorce le cycle auto-planifié de syncLiveScores. Ce dernier ne
 * suit pas un cron fixe : chaque exécution replanifie la suivante avec un
 * délai court s'il y avait des matchs en direct, ou long sinon — voir
 * index.ts où le résultat du job pilote `scheduleNextLiveScoresRun`.
 */
export async function registerScheduledJobs(queue: Queue): Promise<void> {
  await removeAllRepeatableJobs(queue);

  await queue.add(
    JobName.syncFixtures,
    {},
    { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: JobName.syncFixtures, ...DEFAULT_JOB_OPTS },
  );
  await queue.add(
    JobName.syncStandings,
    {},
    { repeat: { every: 8 * 60 * 60 * 1000 }, jobId: JobName.syncStandings, ...DEFAULT_JOB_OPTS },
  );
  await queue.add(
    JobName.syncPlayerStats,
    {},
    { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: JobName.syncPlayerStats, ...DEFAULT_JOB_OPTS },
  );
  await queue.add(
    JobName.syncRosters,
    {},
    { repeat: { every: 6 * 60 * 60 * 1000 }, jobId: JobName.syncRosters, ...DEFAULT_JOB_OPTS },
  );
  // Agent éditorial (apps/worker/src/jobs/editorial) : une fois par jour à 7h
  // heure serveur — jamais de publication automatique, voir runEditorialDigest.
  await queue.add(
    JobName.editorialDigest,
    {},
    { repeat: { pattern: "0 7 * * *" }, jobId: JobName.editorialDigest, ...DEFAULT_JOB_OPTS },
  );
  // Convertit les articles mercato (catégorie TRANSFERTS) déjà publiés en
  // fiches structurées pour /mercato — jamais de publication automatique non
  // plus, voir extractTransfers.ts. Peu coûteux (dédoublonné par sourceUrl,
  // borné à MAX_ARTICLES_PER_RUN) : cadence plus rapprochée que l'agent
  // éditorial pour rattraper vite un article publié entre deux runs.
  await queue.add(
    JobName.extractTransfers,
    {},
    { repeat: { every: 2 * 60 * 60 * 1000 }, jobId: JobName.extractTransfers, ...DEFAULT_JOB_OPTS },
  );
  // football-data.org (gratuit) ne fournit aucune photo de joueur — comble ce
  // manque via TheSportsDB, par petits lots (voir MAX_PLAYERS_PER_RUN dans
  // syncPlayerPhotos.ts) pour rester sous son plan gratuit très limité en débit.
  await queue.add(
    JobName.syncPlayerPhotos,
    {},
    { repeat: { every: 15 * 60 * 1000 }, jobId: JobName.syncPlayerPhotos, ...DEFAULT_JOB_OPTS },
  );
  // Flux RSS public YouTube (pas de clé API, pas de quota) : cadence courte
  // pour que les vidéos publiées sur la chaîne apparaissent vite sur /video.
  await queue.add(
    JobName.syncYoutubeVideos,
    {},
    { repeat: { every: 15 * 60 * 1000 }, jobId: JobName.syncYoutubeVideos, ...DEFAULT_JOB_OPTS },
  );
  // Lundi 8h : la semaine précédente (vendredi-dimanche compris) est terminée.
  await queue.add(
    JobName.weeklyRecap,
    {},
    { repeat: { pattern: "0 8 * * 1" }, jobId: JobName.weeklyRecap, ...DEFAULT_JOB_OPTS },
  );
  // Highlightly (quota gratuit 100 req/jour) : 10 min plutôt que la cadence
  // syncLiveScores — voir MAX_MATCHES_PER_RUN dans syncMatchEvents.ts pour le
  // détail du budget. Ne fait rien s'il n'y a aucun match en direct.
  await queue.add(
    JobName.syncMatchEvents,
    {},
    { repeat: { every: 10 * 60 * 1000 }, jobId: JobName.syncMatchEvents, ...DEFAULT_JOB_OPTS },
  );

  await scheduleNextLiveScoresRun(queue, false);
}

export async function scheduleNextLiveScoresRun(queue: Queue, hadLiveMatches: boolean): Promise<void> {
  const delay = hadLiveMatches ? LIVE_SCORES_INTERVAL_DURING_MATCHES_MS : LIVE_SCORES_INTERVAL_IDLE_MS;
  await queue.add(
    JobName.syncLiveScores,
    {},
    { delay, jobId: `${JobName.syncLiveScores}-${Date.now()}`, ...DEFAULT_JOB_OPTS },
  );
}
