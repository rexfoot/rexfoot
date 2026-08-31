# RexFoot — The King of Football

Plateforme football internationale (actualités, matchs en direct, résultats,
statistiques, équipes, joueurs, compétitions, vidéo). Monorepo npm workspaces,
Next.js + PostgreSQL + Redis, déployé sur Railway avec DNS/SSL Cloudflare sur
`rexfoot.com`.

## Structure

```
apps/web        Next.js (App Router) — frontend + Route Handlers /api/*
apps/worker      process Node autonome — jobs BullMQ (sync fixtures, live scores, classements, stats)
packages/db                 schéma Prisma + client partagé
packages/football-provider  abstraction FootballDataProvider (API-Football + cache Redis + fallback vide)
packages/video-provider     abstraction VideoProvider (stub en v1)
packages/config              variables d'env (zod) + constantes partagées
```

## Démarrage local

1. Copier `.env.example` vers `.env` à la racine et remplir `DATABASE_URL` /
   `REDIS_URL` (voir plugins PostgreSQL/Redis dans ton projet Railway, onglet
   "Connect"). `RAPIDAPI_KEY` peut rester vide — l'app tourne alors avec des
   états vides plutôt que de fausses données.
2. `npm install`
3. `npm run prisma:generate`
4. `npm run prisma:migrate:dev` (première migration — nécessite `DATABASE_URL`)
5. `npm run dev` (apps/web sur http://localhost:3000)
6. `npm run dev:worker` (dans un autre terminal, optionnel en local)

## Déploiement Railway

Deux services Docker à créer dans le même projet Railway, tous deux pointant
sur ce repo GitHub :

- **web** : Settings → Build → Dockerfile Path = `Dockerfile`
- **worker** : Settings → Build → Dockerfile Path = `Dockerfile.worker`

`railway.json` (racine) ne définit **volontairement pas** de `build.dockerfilePath` :
ce fichier est appliqué à tous les services du projet par défaut (sauf s'ils ont
leur propre config-as-code scopée dans Settings → Config-as-code), donc y mettre
un `dockerfilePath` écraserait le réglage Dashboard de chaque service et forcerait
tout le monde à utiliser le même Dockerfile — c'est exactement ce qui a cassé le
service `worker` en config initiale (il buildait `apps/web` malgré son propre
réglage Dashboard correct). Le Dockerfile Path se règle donc uniquement au niveau
de chaque service, dans le Dashboard.

Plus les plugins **PostgreSQL** et **Redis**. Variables d'environnement à
définir sur les deux services (`web` et `worker`) : voir `.env.example`.

Domaine (`rexfoot.com` + `www.rexfoot.com`) : voir la section dédiée du plan
technique (Railway Custom Domain + enregistrements CNAME Cloudflare proxied +
SSL Full strict + redirection www→apex).
