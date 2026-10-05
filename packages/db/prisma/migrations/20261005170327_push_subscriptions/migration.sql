-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_matchId_idx" ON "PushSubscription"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_matchId_endpoint_key" ON "PushSubscription"("matchId", "endpoint");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
