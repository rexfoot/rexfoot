-- CreateEnum
CREATE TYPE "ArticleLocale" AS ENUM ('EN', 'ES');

-- CreateEnum
CREATE TYPE "AgentEntityType" AS ENUM ('FIXTURE', 'NEWS_ARTICLE', 'TRANSFER', 'PLAYER');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "InjuryEventType" AS ENUM ('INJURY', 'SUSPENSION');

-- CreateEnum
CREATE TYPE "InjuryStatus" AS ENUM ('OUT', 'DOUBTFUL', 'SUSPENDED', 'AVAILABLE');

-- CreateTable
CREATE TABLE "ArticleTranslation" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "locale" "ArticleLocale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "contentHtml" TEXT NOT NULL,
    "status" "NewsStatus" NOT NULL DEFAULT 'DRAFT',
    "translatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "entityType" "AgentEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerInjuryStatus" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT,
    "type" "InjuryEventType" NOT NULL,
    "reason" TEXT,
    "status" "InjuryStatus" NOT NULL DEFAULT 'OUT',
    "startDate" TIMESTAMP(3),
    "expectedReturnDate" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerInjuryStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleTranslation_articleId_locale_key" ON "ArticleTranslation"("articleId", "locale");

-- CreateIndex
CREATE INDEX "AgentTask_status_nextRunAt_idx" ON "AgentTask"("status", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTask_entityType_entityId_taskType_key" ON "AgentTask"("entityType", "entityId", "taskType");

-- CreateIndex
CREATE INDEX "PlayerInjuryStatus_status_playerId_idx" ON "PlayerInjuryStatus"("status", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerInjuryStatus_playerId_source_externalId_key" ON "PlayerInjuryStatus"("playerId", "source", "externalId");

-- AddForeignKey
ALTER TABLE "ArticleTranslation" ADD CONSTRAINT "ArticleTranslation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInjuryStatus" ADD CONSTRAINT "PlayerInjuryStatus_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerInjuryStatus" ADD CONSTRAINT "PlayerInjuryStatus_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
