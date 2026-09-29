-- AlterEnum
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'LAMINATION';

-- CreateTable
CREATE TABLE IF NOT EXISTS "LaminationProductionReport" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "operatorName" TEXT,
    "operatorId" TEXT,
    "helperCount" INTEGER NOT NULL DEFAULT 0,
    "supervisorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "totalRollMtrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNetWtBefore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWtBefore" DOUBLE PRECISION DEFAULT 0,
    "totalProductionMtrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNetWtAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWtAfter" DOUBLE PRECISION DEFAULT 0,
    "avgCoating" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationProductionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LaminationProductionEntry" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "quality" TEXT NOT NULL,
    "size" TEXT,
    "loomNumber" INTEGER NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "rollMeter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netWeightBefore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWeightBefore" DOUBLE PRECISION DEFAULT 0,
    "productionMeter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netWeightAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWeightAfter" DOUBLE PRECISION DEFAULT 0,
    "coating" DOUBLE PRECISION DEFAULT 0,
    "remarks" TEXT,
    "loomRollCuttingEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationProductionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LaminationProductionReport_date_shiftName_key" ON "LaminationProductionReport"("date", "shiftName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationProductionReport_date_idx" ON "LaminationProductionReport"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationProductionReport_shiftName_idx" ON "LaminationProductionReport"("shiftName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationProductionReport_status_idx" ON "LaminationProductionReport"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationProductionEntry_reportId_idx" ON "LaminationProductionEntry"("reportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationProductionEntry_rollNumber_idx" ON "LaminationProductionEntry"("rollNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationProductionEntry_quality_idx" ON "LaminationProductionEntry"("quality");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationProductionEntry_loomNumber_idx" ON "LaminationProductionEntry"("loomNumber");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LaminationProductionEntry_reportId_fkey'
    ) THEN
        ALTER TABLE "LaminationProductionEntry" ADD CONSTRAINT "LaminationProductionEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LaminationProductionReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
