-- CreateTable LoomChangeover
CREATE TABLE IF NOT EXISTS "LoomChangeover" (
    "id" TEXT NOT NULL,
    "loomNumber" INTEGER NOT NULL,
    "currentQuality" TEXT,
    "currentColor" TEXT,
    "currentColorGroup" TEXT,
    "currentDenier" DOUBLE PRECISION,
    "currentReedSpace" DOUBLE PRECISION,
    "currentBobbinMark" TEXT,
    "currentMesh" TEXT,
    "nextQualityCode" TEXT,
    "nextColor" TEXT,
    "nextColorGroup" TEXT,
    "nextDenier" DOUBLE PRECISION,
    "nextReedSpace" DOUBLE PRECISION,
    "nextBobbinMark" TEXT,
    "nextMesh" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "targetDate" TEXT,
    "targetShiftId" TEXT,
    "targetShiftName" TEXT,
    "remarks" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoomChangeover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LoomChangeover_loomNumber_key" ON "LoomChangeover"("loomNumber");
CREATE INDEX IF NOT EXISTS "LoomChangeover_loomNumber_idx" ON "LoomChangeover"("loomNumber");
CREATE INDEX IF NOT EXISTS "LoomChangeover_status_idx" ON "LoomChangeover"("status");
CREATE INDEX IF NOT EXISTS "LoomChangeover_sequence_idx" ON "LoomChangeover"("sequence");
