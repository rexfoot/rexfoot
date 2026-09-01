-- CreateEnum
CREATE TYPE "TrendingEntityType" AS ENUM ('ARTICLE', 'VIDEO', 'TEAM', 'PLAYER');

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "entityType" "TrendingEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_entityType_createdAt_idx" ON "PageView"("entityType", "createdAt");
