-- AlterTable LoomReadingEntry
ALTER TABLE "LoomReadingEntry" ADD COLUMN IF NOT EXISTS "rowSequence" INTEGER NOT NULL DEFAULT 1;

-- DropIndex old unique constraint if exists
DROP INDEX IF EXISTS "LoomReadingEntry_sheetId_loomNumber_key";

-- CreateIndex new unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "LoomReadingEntry_sheetId_loomNumber_rowSequence_key" ON "LoomReadingEntry"("sheetId", "loomNumber", "rowSequence");

-- CreateTable LoomRollCuttingReport
CREATE TABLE IF NOT EXISTS "LoomRollCuttingReport" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "supervisorName" TEXT,
    "preparedBy" TEXT,
    "checkedBy" TEXT,
    "approvedBy" TEXT,
    "totalRollsCount" INTEGER NOT NULL DEFAULT 0,
    "totalMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGrossWtKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTareWtKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNettWtKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageWeightPerMeter" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomRollCuttingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable LoomRollCuttingEntry
CREATE TABLE IF NOT EXISTS "LoomRollCuttingEntry" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "rollNumber" TEXT NOT NULL,
    "loomNumber" INTEGER NOT NULL,
    "size" TEXT,
    "qualityType" TEXT NOT NULL,
    "initialReading" DOUBLE PRECISION NOT NULL,
    "finalReading" DOUBLE PRECISION NOT NULL,
    "meter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tareWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "nettWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWeightPerMeter" DOUBLE PRECISION DEFAULT 0,
    "supervisorSign" TEXT,
    "remarks" TEXT,
    "productionRollId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomRollCuttingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LoomRollCuttingReport_date_shiftName_key" ON "LoomRollCuttingReport"("date", "shiftName");
CREATE INDEX IF NOT EXISTS "LoomRollCuttingReport_date_idx" ON "LoomRollCuttingReport"("date");
CREATE INDEX IF NOT EXISTS "LoomRollCuttingReport_shiftName_idx" ON "LoomRollCuttingReport"("shiftName");
CREATE INDEX IF NOT EXISTS "LoomRollCuttingReport_status_idx" ON "LoomRollCuttingReport"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoomRollCuttingEntry_rollNumber_idx" ON "LoomRollCuttingEntry"("rollNumber");
CREATE INDEX IF NOT EXISTS "LoomRollCuttingEntry_loomNumber_idx" ON "LoomRollCuttingEntry"("loomNumber");
CREATE INDEX IF NOT EXISTS "LoomRollCuttingEntry_qualityType_idx" ON "LoomRollCuttingEntry"("qualityType");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LoomRollCuttingEntry_reportId_fkey'
    ) THEN
        ALTER TABLE "LoomRollCuttingEntry" ADD CONSTRAINT "LoomRollCuttingEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LoomRollCuttingReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
