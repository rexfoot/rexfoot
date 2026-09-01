-- DropIndex
DROP INDEX "NewsArticle_isBreaking_publishedAt_idx";

-- AlterTable
ALTER TABLE "NewsArticle" ADD COLUMN     "breakingSince" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "NewsArticle_isBreaking_breakingSince_idx" ON "NewsArticle"("isBreaking", "breakingSince");
