-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('OFFICIEL', 'AVANCE', 'EN_DISCUSSION', 'RUMEUR');

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "fromClubName" TEXT,
    "toClubName" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'RUMEUR',
    "feeMillionEur" DOUBLE PRECISION,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "transferDate" TIMESTAMP(3),
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "authorId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transfer_status_publishedAt_idx" ON "Transfer"("status", "publishedAt");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
