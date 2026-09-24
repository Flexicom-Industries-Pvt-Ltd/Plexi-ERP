-- CreateTable
CREATE TABLE IF NOT EXISTS "GateStatusLog" (
    "id" TEXT NOT NULL,
    "gateEntryId" TEXT NOT NULL,
    "status" "GateEntryStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "remarks" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GateStatusLog_gateEntryId_idx" ON "GateStatusLog"("gateEntryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GateStatusLog_gateEntryId_timestamp_idx" ON "GateStatusLog"("gateEntryId", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GateStatusLog_timestamp_idx" ON "GateStatusLog"("timestamp");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GateStatusLog_gateEntryId_fkey'
    ) THEN
        ALTER TABLE "GateStatusLog" ADD CONSTRAINT "GateStatusLog_gateEntryId_fkey" 
        FOREIGN KEY ("gateEntryId") REFERENCES "GateEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'GateStatusLog_updatedBy_fkey'
    ) THEN
        ALTER TABLE "GateStatusLog" ADD CONSTRAINT "GateStatusLog_updatedBy_fkey" 
        FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Backfill initial GateStatusLog for existing GateEntry records
INSERT INTO "GateStatusLog" ("id", "gateEntryId", "status", "timestamp", "updatedBy", "remarks", "createdAt")
SELECT 
    'gsl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
    "id",
    'ARRIVED'::"GateEntryStatus",
    "arrivalTime",
    "createdBy",
    'Initial truck arrival registered at gate',
    "createdAt"
FROM "GateEntry" ge
WHERE NOT EXISTS (
    SELECT 1 FROM "GateStatusLog" gsl WHERE gsl."gateEntryId" = ge."id" AND gsl."status" = 'ARRIVED'
);

-- If existing GateEntry status is beyond ARRIVED, insert a status log for its current status at updatedAt
INSERT INTO "GateStatusLog" ("id", "gateEntryId", "status", "timestamp", "updatedBy", "remarks", "createdAt")
SELECT 
    'gsl_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16),
    "id",
    "status",
    COALESCE("exitTime", "updatedAt"),
    "updatedBy",
    CASE 
        WHEN "status" = 'GATE_OUT' THEN COALESCE("finalRemarks", 'Vehicle gated out and departed')
        WHEN "parkingLocation" IS NOT NULL THEN 'Parking bay allocated: ' || "parkingLocation"
        ELSE 'Status transition to ' || "status"::text
    END,
    "updatedAt"
FROM "GateEntry" ge
WHERE "status" != 'ARRIVED'
AND NOT EXISTS (
    SELECT 1 FROM "GateStatusLog" gsl WHERE gsl."gateEntryId" = ge."id" AND gsl."status" = ge."status"
);
