# RexFoot — apps/web (Next.js)
# Build multi-stage : installe le workspace complet à la racine (nécessaire pour
# que packages/* résolvent correctement via npm workspaces), génère le client
# Prisma, build Next.js, puis image d'exécution minimale.

FROM node:22-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/football-provider/package.json packages/football-provider/package.json
COPY packages/video-provider/package.json packages/video-provider/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run prisma:generate
RUN npm run build --workspace=apps/web

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/next.config.ts ./apps/web/next.config.ts

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
