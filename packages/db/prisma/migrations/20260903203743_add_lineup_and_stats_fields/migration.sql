-- AlterTable
ALTER TABLE "TeamStatistics" ADD COLUMN     "bigChancesCreated" INTEGER,
ADD COLUMN     "expectedGoals" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Lineup" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "formation" TEXT,
    "startingXI" JSONB NOT NULL,
    "substitutes" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lineup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lineup_fixtureId_teamId_key" ON "Lineup"("fixtureId", "teamId");

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
