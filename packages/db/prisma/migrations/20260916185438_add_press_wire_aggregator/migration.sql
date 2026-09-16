-- CreateEnum
CREATE TYPE "HeadlineStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "AggregatedHeadline" (
    "id" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "HeadlineStatus" NOT NULL DEFAULT 'DRAFT',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AggregatedHeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AggregatedHeadlineSource" (
    "id" TEXT NOT NULL,
    "headlineId" TEXT NOT NULL,
    "publisherName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "excerpt" TEXT,
    "thumbnailUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AggregatedHeadlineSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AggregatedHeadline_status_firstSeenAt_idx" ON "AggregatedHeadline"("status", "firstSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "AggregatedHeadlineSource_headlineId_url_key" ON "AggregatedHeadlineSource"("headlineId", "url");

-- AddForeignKey
ALTER TABLE "AggregatedHeadlineSource" ADD CONSTRAINT "AggregatedHeadlineSource_headlineId_fkey" FOREIGN KEY ("headlineId") REFERENCES "AggregatedHeadline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
