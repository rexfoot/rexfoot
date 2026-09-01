-- CreateEnum
CREATE TYPE "MatchVoteChoice" AS ENUM ('HOME', 'DRAW', 'AWAY');

-- CreateTable
CREATE TABLE "MatchVote" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "choice" "MatchVoteChoice" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchVote_fixtureId_idx" ON "MatchVote"("fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchVote_fixtureId_voterKey_key" ON "MatchVote"("fixtureId", "voterKey");

-- AddForeignKey
ALTER TABLE "MatchVote" ADD CONSTRAINT "MatchVote_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
