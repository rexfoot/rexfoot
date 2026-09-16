-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "apiFootballId" INTEGER,
ADD COLUMN     "apiFootballLookupAttemptedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "apiFootballId" INTEGER;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "apiFootballId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Competition_apiFootballId_key" ON "Competition"("apiFootballId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_apiFootballId_key" ON "Team"("apiFootballId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_apiFootballId_key" ON "Player"("apiFootballId");
