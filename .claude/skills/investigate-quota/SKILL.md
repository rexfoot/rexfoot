---
name: investigate-quota
description: Checklist de diagnostic quand RexFoot semble "en retard" ou "figé" (scores, blessures, photos, articles) — distingue un vrai bug d'un quota API épuisé avant de creuser plus loin.
---

# Diagnostiquer un problème de quota / 429 sur RexFoot

Symptôme typique : "les scores/photos/blessures n'apparaissent plus" ou "l'agent éditorial ne produit plus rien". Avant de chercher un bug de code, éliminer un quota épuisé — c'est la cause la plus fréquente historiquement sur ce projet.

## 1. Identifier quel fournisseur est en cause

| Symptôme | Fournisseur probable | Où regarder |
|---|---|---|
| Scores/matchs en retard | football-data.org | `packages/football-provider/src/providers/footballDataOrg.ts` — plan "Free w/ Livescores", 20 req/min |
| Buts/cartons/compositions en retard | Highlightly | `syncMatchEvents.ts` + `Fixture.highlightlyLookupAttemptedAt` — plan Pro 7500 req/jour depuis 2026-09-06 |
| Photos joueurs manquantes | TheSportsDB | `syncPlayerPhotos.ts` — clé "test" partagée, rate-limitée indépendamment du trafic RexFoot (429 constaté 2026-09-06, cause de ~48.9% de photos manquantes) |
| Articles/traductions ne se génèrent plus | Gemini/Groq/OpenRouter | `packages/ai-provider` — `createAiProvider()` bascule déjà automatiquement Gemini→Groq→OpenRouter sur échec, donc un vrai blocage total signifie que LES TROIS ont échoué |
| Blessures/suspensions vides | API-Football `/injuries` | `syncInjuries.ts` — peut être le plan souscrit qui ne couvre pas cet endpoint (voir le piège "200 avec `errors` non vide" documenté dans `apiFootball.ts`) |

## 2. Vérifier les logs worker en premier

`logger.warn`/`logger.error` avec un message explicite existe déjà pour chaque cas d'échec fournisseur (jamais d'échec silencieux par design). Chercher `429`, `quota`, `échec`, ou le nom du fournisseur suspecté dans les logs Railway du service worker.

## 3. Vérifier le ledger AgentTask pour les nouveaux agents

Pour traduction/blessures (ajoutés récemment) : requêter `AgentTask` où `status = FAILED`, regarder `lastError` — ou utiliser le skill `pipeline-health` / l'agent de supervision planifié qui fait déjà cette lecture.

## 4. Ne JAMAIS répondre à un 429 en resserrant la cadence sans réfléchir

Chaque cadence dans `scheduler.ts` porte un commentaire expliquant le calcul exact vs. la limite documentée du fournisseur — une cadence resserrée sans recalculer le budget a déjà causé un quota épuisé en moins d'une heure (incident du 2026-09-05, Highlightly). Toujours recalculer : `(requêtes par cycle) × (cycles par jour) < quota documenté`, avec marge.

## 5. Si le quota est structurellement insuffisant

Ne pas proposer de passer à un plan payant sans validation explicite d'Hicham — c'est une dépense, la règle budget du projet l'exige. Documenter le calcul de pourquoi le plan actuel est insuffisant, et laisser la décision à l'utilisateur.
