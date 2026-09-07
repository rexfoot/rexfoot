-- CreateTable
CREATE TABLE "LiveAudioStream" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveAudioStream_pkey" PRIMARY KEY ("id")
);
