-- AlterTable
ALTER TABLE "Fixture" ADD COLUMN     "highlightlyId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_highlightlyId_key" ON "Fixture"("highlightlyId");
