-- CreateEnum
CREATE TYPE "BreakingPriority" AS ENUM ('HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "NewsArticle" ADD COLUMN     "breakingPriority" "BreakingPriority" NOT NULL DEFAULT 'HIGH',
ADD COLUMN     "isBreaking" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "NewsArticle_isBreaking_publishedAt_idx" ON "NewsArticle"("isBreaking", "publishedAt");
