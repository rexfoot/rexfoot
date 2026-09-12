import { Queue } from "bullmq";
import { prisma } from "@rexfoot/db";
import { getActiveProviderName } from "@rexfoot/football-provider";
import { createBullMqConnection } from "./lib/redis.js";

const PROVIDER_NAME = getActiveProviderName();

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

// Le fournisseur actif est football-data.org, plan "Free w/ Livescores"
// (12E/mois depuis le 2026-09-05 — l'ancien plan gratuit retardait les scores
// DELIBEREMENT, un cycle de sync plus rapide n'y aurait rien change) :
// 20 requetes/MINUTE, aucun plafond quotidien — voir MAX_REQUESTS_PER_WINDOW
// dans footballDataOrg.ts. Resserre a 15s le 2026-09-05 (demande explicite :
// un but visible sur Sofascore doit apparaitre sur RexFoot en moins de 30s,
// sans dependre du repli Highlightly a 10 min) — 4 requetes/min pour ce seul
// job, large sous la limite meme avec les appels occasionnels de
// finalizeRecentMatches/staleLive dans le meme cycle. Idle laisse a 3 min :
// sert seulement a detecter qu'un match vient de commencer, moins critique
// que la fraicheur en direct.
const LIVE_SCORES_INTERVAL_DURING_MATCHES_MS = 15 * 1000;
const LIVE_SCORES_INTERVAL_IDLE_MS = 3 * 60 * 1000;

// Highlightly plan Pro depuis le 2026-09-06 (7500 requêtes/jour, contre 100
// sur l'ancien plan gratuit qui justifiait les 10 min fixes ci-dessous
// pendant des années) : un but/carton/remplacement pouvait mettre jusqu'à
// 10 min à apparaître sur RexFoot après avoir déjà été visible ailleurs —
// Hicham a signalé ce retard explicitement. 60s pendant un match reste large
// sous la limite (~12 req/s documentée par RapidAPI pour ce plan) même avec
// plusieurs matchs simultanés + les lookups de résolution d'ID ; borné pour
// qu'une grosse journée de matchs ne consomme pas tout le quota journalier
// avant le soir (voir MAX_MATCHES_PER_RUN/MAX_LOOKUP_PER_RUN dans
// syncMatchEvents.ts pour le budget par cycle). Idle laissé à 10 min :
// aucune urgence à détecter un nouveau match hors direct, syncLiveScores
// s'en charge déjà en 15s.
const MATCH_EVENTS_INTERVAL_DURING_MATCHES_MS = 60 * 1000;
const MATCH_EVENTS_INTERVAL_IDLE_MS = 10 * 60 * 1000;

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

/**
 * syncLiveScores ne suit pas un `repeat` BullMQ classique : chaque exécution
 * planifie elle-même la suivante via un job ponctuel a delai (jobId unique,
 * voir scheduleNextLiveScoresRun). Consequence reelle constatee en prod : au
 * redemarrage du worker (chaque redeploiement), removeAllRepeatableJobs ne
 * voit pas ce job ponctuel deja en attente dans Redis (ce n'est pas un
 * "repeatable" au sens BullMQ) — il reste planifie, et quand il finit par se
 * declencher il relance SA PROPRE chaine, en parallele de celle du nouveau
 * process. Apres plusieurs redeploiements, plusieurs chaines tournaient en
 * meme temps (constate : 9 executions quasi simultanees dans les logs),
 * gaspillant le quota API et rendant la cadence imprevisible. On purge donc
 * explicitement tout syncLiveScores en attente avant d'en replanifier un seul.
 */
async function removeOrphanedLiveScoresJobs(queue: Queue): Promise<void> {
  const pending = await queue.getJobs(["delayed", "waiting"]);
  for (const job of pending) {
    if (job.name === JobName.syncLiveScores) {
      await job.remove();
    }
  }
}

/** Même problème, même remède que removeOrphanedLiveScoresJobs — voir son commentaire. */
async function removeOrphanedMatchEventsJobs(queue: Queue): Promise<void> {
  const pending = await queue.getJobs(["delayed", "waiting"]);
  for (const job of pending) {
    if (job.name === JobName.syncMatchEvents) {
      await job.remove();
    }
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
  await removeOrphanedLiveScoresJobs(queue);
  await removeOrphanedMatchEventsJobs(queue);

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
  // Resserré de 15 min à 5 min le 2026-09-05 (demandé par Hicham : aucune
  // photo sur la compo d'un match en direct) — le rythme À L'INTÉRIEUR d'un
  // lot ne change pas (toujours DELAY_BETWEEN_REQUESTS_MS entre requêtes),
  // seule la fréquence des lots triple, donc toujours sous la limite
  // documentée de TheSportsDB (~30 req/min) à l'intérieur de chaque lot.
  await queue.add(
    JobName.syncPlayerPhotos,
    {},
    { repeat: { every: 5 * 60 * 1000 }, jobId: JobName.syncPlayerPhotos, ...DEFAULT_JOB_OPTS },
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
  // syncMatchEvents suit désormais le même principe auto-replanifié que
  // syncLiveScores ci-dessous (voir MATCH_EVENTS_INTERVAL_*_MS) plutôt qu'un
  // repeat fixe — départ rapide pour la même raison qu'au démarrage de
  // syncLiveScores : ne pas attendre l'intervalle idle avant la première
  // détection d'un match déjà en cours.
  await queue.add(
    JobName.syncMatchEvents,
    {},
    { delay: 10 * 1000, jobId: `${JobName.syncMatchEvents}-startup-${Date.now()}`, ...DEFAULT_JOB_OPTS },
  );

  // Premier check volontairement rapide (pas l'attente idle complete de 3
  // min) : au demarrage, on ne sait pas encore s'il y a un match en direct —
  // attendre l'intervalle idle par defaut retarderait inutilement la toute
  // premiere detection a chaque redeploiement, justement le moment ou un
  // match peut deja etre en cours.
  await queue.add(
    JobName.syncLiveScores,
    {},
    { delay: 10 * 1000, jobId: `${JobName.syncLiveScores}-startup-${Date.now()}`, ...DEFAULT_JOB_OPTS },
  );
}

// Petite marge après le coup d'envoi théorique avant de vérifier : laisse le
// temps au fournisseur de basculer son propre statut, évite de taper juste
// avant et de devoir attendre un cycle idle complet en plus si le fournisseur
// n'a pas encore mis à jour.
const KICKOFF_CHECK_BUFFER_MS = 5 * 1000;

/**
 * En cadence idle, ne pas attendre bêtement l'intervalle complet
 * (LIVE_SCORES_INTERVAL_IDLE_MS) si un coup d'envoi connu tombe avant —
 * sinon un match qui démarre pendant cette fenêtre reste affiché "à venir"
 * jusqu'à 3 min après avoir réellement commencé (bug régulièrement signalé
 * par Hicham à chaque nouvelle journée de matchs : "les matchs ont commencé
 * et RexFoot n'affiche rien"). Complète le filet de rattrapage réactif de
 * `kickoffPending` dans syncLiveScores.ts, qui ne peut lui-même se déclencher
 * qu'AU check suivant — celui-ci vise à avancer ce check au bon moment plutôt
 * que de découvrir le retard après coup.
 */
async function nextKnownKickoffDelayMs(defaultDelayMs: number): Promise<number> {
  const next = await prisma.fixture.findFirst({
    where: {
      provider: PROVIDER_NAME,
      status: "SCHEDULED",
      kickoffAt: { gt: new Date(), lte: new Date(Date.now() + defaultDelayMs) },
    },
    orderBy: { kickoffAt: "asc" },
    select: { kickoffAt: true },
  });
  if (!next) return defaultDelayMs;
  return Math.max(next.kickoffAt.getTime() - Date.now() + KICKOFF_CHECK_BUFFER_MS, KICKOFF_CHECK_BUFFER_MS);
}

export async function scheduleNextLiveScoresRun(queue: Queue, hadLiveMatches: boolean): Promise<void> {
  const defaultDelay = hadLiveMatches ? LIVE_SCORES_INTERVAL_DURING_MATCHES_MS : LIVE_SCORES_INTERVAL_IDLE_MS;
  const delay = hadLiveMatches ? defaultDelay : await nextKnownKickoffDelayMs(defaultDelay);
  await queue.add(
    JobName.syncLiveScores,
    {},
    { delay, jobId: `${JobName.syncLiveScores}-${Date.now()}`, ...DEFAULT_JOB_OPTS },
  );
}

/**
 * Même principe que scheduleNextLiveScoresRun — mais le commentaire le disait
 * déjà sans que le code le fasse (bug réel constaté en prod, 2026-09-12,
 * Hicham : "minute" affichée jusqu'à ~6 min en retard). Cause : football-
 * data.org ne renseigne quasiment jamais `minute` sur ce plan (voir
 * syncLiveScores.ts) — c'est syncMatchEvents.ts (repli Highlightly) qui la
 * pose, mais SANS ce réveil anticipé il restait bloqué sur son intervalle
 * idle (10 min) jusqu'à 10 min après un coup d'envoi déjà détecté par
 * syncLiveScores (qui, lui, se réveille au bon moment). Le score/statut
 * apparaissaient à l'heure, la minute non.
 */
export async function scheduleNextMatchEventsRun(queue: Queue, hadLiveMatches: boolean): Promise<void> {
  const defaultDelay = hadLiveMatches ? MATCH_EVENTS_INTERVAL_DURING_MATCHES_MS : MATCH_EVENTS_INTERVAL_IDLE_MS;
  const delay = hadLiveMatches ? defaultDelay : await nextKnownKickoffDelayMs(defaultDelay);
  await queue.add(
    JobName.syncMatchEvents,
    {},
    { delay, jobId: `${JobName.syncMatchEvents}-${Date.now()}`, ...DEFAULT_JOB_OPTS },
  );
}
