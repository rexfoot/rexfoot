---
name: add-competition
description: Checklist sûre pour ajouter une nouvelle compétition vedette à RexFoot (ex. Botola, Saudi Pro League, Copa América) sans casser la résolution multi-fournisseurs existante.
---

# Ajouter une compétition à RexFoot

Utiliser cette checklist avant d'ajouter une ligue/coupe à `FEATURED_COMPETITION_SLUGS`. Ne PAS se contenter d'ajouter le slug — les IDs sont spécifiques à chaque fournisseur et une résolution par nom seul peut silencieusement matcher la mauvaise compétition (ex. plusieurs "Premier League" dans le monde).

1. **Vérifier la disponibilité chez le fournisseur actif d'abord** (`getActiveProviderName()` — football-data.org par défaut). Chercher l'ID numérique documenté publiquement pour cette compétition. Si absent, passer à l'étape 2.
2. **Vérifier ESPN en repli gratuit** — regarder `COMPETITION_TO_ESPN_SLUG` dans `packages/football-provider/src/providers/espn.ts` pour le format de slug attendu.
3. **Vérifier API-Football en dernier recours** — nécessite `RAPIDAPI_KEY` déjà configurée (elle l'est). Chercher l'ID `/leagues` correspondant.
4. **Ajouter le slug** à `FEATURED_COMPETITION_SLUGS` dans `packages/config/src/constants.ts`.
5. **Ajouter l'ID résolu** à `FOOTBALL_DATA_ORG_COMPETITION_IDS` et/ou `API_FOOTBALL_COMPETITION_IDS` dans `apps/worker/src/lib/competitions.ts`, avec un commentaire citant la source de l'ID (doc officielle, pas une supposition).
6. **Ajouter les métadonnées de repli** dans `COMPETITION_FALLBACK_META` (nom, type, pays, tier d'affichage) — nécessaire même si un fournisseur la résout, sert de filet si tous échouent temporairement.
7. **Vérifier le budget/quota AVANT de déployer** : cette compétition va-t-elle consommer un fournisseur déjà proche de sa limite (voir `MEMORY.md` / mémoire du projet pour l'état actuel des quotas Highlightly/API-Football/TheSportsDB) ? Si la compétition nécessite un nouveau plan payant (ex. Highlightly Pro pour un pays non couvert), **s'arrêter et demander l'autorisation explicite d'Hicham** avant de continuer — règle budget absolue du projet.
8. **Tester en local** : `npm run dev:worker`, déclencher `syncFixtures` manuellement, vérifier en base que la `Competition` se crée avec le bon `provider`/`externalId` (pas `provider: "fallback"` sauf si c'est le comportement attendu).
9. **Ne jamais toucher** aux cadences de `scheduler.ts` pour cette seule addition — les jobs existants scannent déjà toutes les compétitions actives.
