# RexFoot — repère pour Claude Code

Monorepo npm workspaces : `apps/web` (Next.js, site public `[locale]` fr/en/es + `/admin`), `apps/worker` (Node/TS, BullMQ+Redis — c'est le cœur du 24/7), `packages/{db,config,ai-provider,football-provider,video-provider,supervisor-mcp}`. Postgres via Prisma. Déployé sur Railway.

**Solo dev, budget serré.** Aucune nouvelle dépendance payante (API, service, abonnement) sans autorisation explicite d'Hicham. Priorité absolue à réutiliser l'existant.

## Base de données — ATTENTION

`.env` `DATABASE_URL` pointe **directement sur la production Railway** (`sakura.proxy.rlwy.net`) — il n'existe **aucune base de dev séparée** dans ce repo. `prisma migrate dev`/`deploy`/`db push` s'appliquent donc en prod. Un hook (`.claude/settings.json` + `.claude/hooks/guard-prisma-migrate.mjs`) demande confirmation avant `migrate deploy`/`db push` — pas avant `migrate dev`, qui reste le chemin normal mais s'applique quand même en prod : réfléchir avant chaque migration, jamais la lancer par réflexe.

## Newsroom multi-agents

RexFoot a un vrai pipeline éditorial 24/7 tournant en jobs BullMQ (`apps/worker/src/scheduler.ts` pour les cadences, `apps/worker/src/index.ts` pour le dispatch). Chaque "agent" du cahier des charges (matchs, mercato, blessures, actus, breaking news, SEO, traduction) est un job BullMQ existant ou nouveau — **jamais** un système de scheduling parallèle. `registerScheduledJobs` purge et réenregistre tout au démarrage ; `syncLiveScores`/`syncMatchEvents` s'auto-replanifient avec cadence adaptative (rapide pendant les matchs, idle sinon) et **ne s'arrêtent jamais sur une erreur transitoire** (voir les commentaires de `index.ts` — incident réel du 2026-09-05).

Principaux jobs :
- `syncFixtures`/`syncLiveScores`/`syncMatchEvents`/`syncStandings`/`syncRosters`/`syncPlayerStats`/`syncPlayerPhotos` — données match/club/joueur, cross-fournisseur (football-data.org primary, API-Football secondary, ESPN fallback, Highlightly pour l'enrichissement live). `Fixture.finalScoreConfirmedAt`/`finalEventsConfirmedAt` empêchent un match FINISHED de rester figé avec un score/événement faux (bug réel corrigé).
- `runEditorialDigest` (agent éditorial) — RSS → clustering anti-doublon (`CoveredTopic`) → rédaction IA (`createAiProvider()`, fallback Gemini→Groq→OpenRouter) → `NewsArticle` en **DRAFT, jamais publié automatiquement** (revue humaine obligatoire dans `/admin/news`).
- `extractTransfersFromArticles` — structure les articles mercato déjà publiés en fiches `Transfer`.
- `translateArticles` (nouveau) — traduit en EN/ES les `NewsArticle` déjà PUBLISHED (jamais un DRAFT) vers `ArticleTranslation`, elle-même publiée manuellement depuis `/admin/news` (panneau "Traductions"). Réutilise `createAiProvider()`, pas de nouveau fournisseur.
- `syncInjuries` (nouveau) — blessures/suspensions via API-Football `/injuries`, désactivé proprement si `RAPIDAPI_KEY` absent ou si le plan ne couvre pas l'endpoint. **Problème résolu** : `Competition.externalId`/`Team.externalId` appartiennent au fournisseur actif (football-data.org), pas à API-Football — `Competition.apiFootballId`/`Team.apiFootballId`/`Player.apiFootballId` sont des caches de résolution par nom (même principe que `Fixture.highlightlyId`), voir `apps/worker/src/jobs/syncInjuries.ts`.

### Ledger `AgentTask`

Table Postgres (`packages/db/prisma/schema.prisma`) qui trace, par entité+type de tâche, le dernier essai d'un agent (PENDING/RUNNING/DONE/FAILED, `attempts`, `lastError`). C'est la mémoire persistante inter-agents demandée : BullMQ exécute, `AgentTask` retient l'historique que BullMQ oublie. Utiliser `runAgentTask()` (`apps/worker/src/lib/agentTask.ts`) pour tout nouveau job qui enrichit une entité existante plutôt que d'écrire un nouveau mécanisme de suivi.

### Supervision

`packages/supervisor-mcp` — serveur MCP **en lecture seule** exposant l'état du pipeline (tâches en échec, backlog éditorial, trous de traduction, fraîcheur blessures) à un agent Claude Code planifié (cf. skill `pipeline-health` et le skill `schedule`). Ne modifie jamais rien en production — il signale, la correction reste une session Claude Code normale avec revue humaine.

## Pièges connus (déjà corrigés, ne pas réintroduire)

- Ne jamais supposer qu'un `externalId`/`apiFootballId`/`highlightlyId` est le même nombre chez deux fournisseurs différents — toujours passer par une résolution par nom mise en cache (voir `sameTeamName` dans `packages/football-provider/src/highlightly.ts`, et `syncInjuries.ts`).
- Un statut "terminal" (`Fixture.status = FINISHED`, `PlayerInjuryStatus` en cours) doit être revérifié périodiquement, jamais figé pour toujours — les fournisseurs corrigent parfois après coup.
- Le quota Gemini est partagé entre TOUTES les tâches IA (rédaction, traduction...) — `createAiProvider()` gère déjà le repli Gemini→Groq→OpenRouter, ne pas contourner ce mécanisme.
- Toujours borner un nouveau job par lot (`MAX_*_PER_RUN`) et isoler les erreurs par entité (try/catch dans la boucle) — jamais laisser une entité en échec bloquer tout le run.
