-- CreateEnum
CREATE TYPE "TalentPosition" AS ENUM ('GOALKEEPER', 'CENTRE_BACK', 'RIGHT_BACK', 'LEFT_BACK', 'DEFENSIVE_MIDFIELDER', 'CENTRE_MIDFIELDER', 'ATTACKING_MIDFIELDER', 'RIGHT_WINGER', 'LEFT_WINGER', 'STRIKER');

-- CreateEnum
CREATE TYPE "PreferredFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "TalentSituation" AS ENUM ('FREE_AGENT', 'IN_CLUB', 'SEEKING_CLUB', 'CONTRACT_ENDING');

-- CreateEnum
CREATE TYPE "TalentModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

-- AlterEnum
ALTER TYPE "TrendingEntityType" ADD VALUE 'TALENT_PROFILE';

-- CreateTable
CREATE TABLE "TalentProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "nationality" TEXT NOT NULL,
    "currentCountry" TEXT NOT NULL,
    "city" TEXT,
    "position" "TalentPosition" NOT NULL,
    "secondaryPosition" "TalentPosition",
    "preferredFoot" "PreferredFoot",
    "heightCm" INTEGER,
    "situation" "TalentSituation" NOT NULL,
    "currentClub" TEXT,
    "targetCountries" TEXT[],
    "openToAnyCountry" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "videoId" TEXT,
    "about" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentGivenAt" TIMESTAMP(3),
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "parentConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNumber" TEXT NOT NULL,
    "contactConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "status" "TalentModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "contactClickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TalentProfile_slug_key" ON "TalentProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TalentProfile_videoId_key" ON "TalentProfile"("videoId");

-- CreateIndex
CREATE INDEX "TalentProfile_status_createdAt_idx" ON "TalentProfile"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "TalentProfile" ADD CONSTRAINT "TalentProfile_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentProfile" ADD CONSTRAINT "TalentProfile_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
