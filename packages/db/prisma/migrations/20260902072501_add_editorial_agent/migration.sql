-- AlterTable
ALTER TABLE "NewsArticle" ADD COLUMN     "isAiDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suggestedVideoUrl" TEXT;

-- CreateTable
CREATE TABLE "ArticleSource" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisherName" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoveredTopic" (
    "id" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "articleId" TEXT,
    "sourceUrls" TEXT[],
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoveredTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoveredTopic_topicKey_key" ON "CoveredTopic"("topicKey");

-- AddForeignKey
ALTER TABLE "ArticleSource" ADD CONSTRAINT "ArticleSource_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
