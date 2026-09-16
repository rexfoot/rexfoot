---
name: pipeline-health
description: Interroge à la demande l'état de la newsroom multi-agents RexFoot (tâches en échec, backlog éditorial, trous de traduction, fraîcheur des blessures) — équivalent manuel de ce que fait l'agent de supervision Claude planifié.
---

# Vérifier l'état de la newsroom RexFoot

Le serveur MCP `@rexfoot/supervisor-mcp` (`packages/supervisor-mcp`) expose 4 outils en lecture seule sur la base de données de production. C'est la même source que lit l'agent de supervision Claude planifié quotidien (voir `CLAUDE.md`, section Supervision) — ce skill sert à faire la même vérification à la demande, en session interactive.

## Outils disponibles (si le serveur MCP `rexfoot-supervisor` est configuré dans cette session)

- `getFailedTasks` — tâches d'agents (`AgentTask`) en échec, avec `lastError`.
- `getDraftBacklog` — articles rédigés par l'agent éditorial encore en attente de revue humaine dans `/admin/news`.
- `getTranslationGaps` — articles publiés sans traduction EN/ES.
- `getInjurySyncFreshness` — état de la résolution d'ID API-Football et dernière synchro blessures réussie.

## Démarche

1. Si les outils `mcp__rexfoot-supervisor__*` ne sont pas déjà chargés/visibles dans cette session, vérifier que le serveur MCP est déclaré (`.mcp.json` à la racine du repo) et que l'utilisateur l'a autorisé.
2. Appeler les 4 outils, résumer les résultats en français, en priorisant :
   - Un nombre élevé de `FAILED` récents → creuser avec le skill `investigate-quota` si le pattern ressemble à un quota épuisé.
   - Un backlog éditorial qui grossit sans être traité → signaler à Hicham qu'il y a des articles en attente de revue dans `/admin/news`, ne jamais les publier soi-même.
   - Des trous de traduction anciens (articles publiés depuis longtemps sans EN/ES) → vérifier que le job `translateArticles` tourne bien (cadence 30 min) plutôt que de retraduire manuellement.
3. Ne jamais utiliser ce skill pour écrire en base — il n'existe d'ailleurs aucun outil d'écriture côté MCP par construction. Une correction reste une action de code normale, avec revue humaine.
