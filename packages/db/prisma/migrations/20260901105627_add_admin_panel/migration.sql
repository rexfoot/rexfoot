-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('TRANSFERTS', 'RESULTATS', 'ANALYSES', 'INTERVIEWS', 'COMPETITIONS', 'INTERNATIONAL', 'AUTRE');

-- AlterTable
ALTER TABLE "NewsArticle" ADD COLUMN     "category" "NewsCategory" NOT NULL DEFAULT 'AUTRE';

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);
