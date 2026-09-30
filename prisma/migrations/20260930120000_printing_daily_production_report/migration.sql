-- AlterEnum
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'PRINTING';

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrintingDailyReport" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "machineNo" TEXT NOT NULL DEFAULT 'Machine-1',
    "companyName" TEXT DEFAULT 'FLEXICOM INDUSTRIES PVT. LIMITED',
    "unitName" TEXT DEFAULT 'Unit-1',
    "operatorName" TEXT,
    "operatorId" TEXT,
    "supervisorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "totalRolls" INTEGER NOT NULL DEFAULT 0,
    "totalProductionMtrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNetWt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWeightGsm" DOUBLE PRECISION DEFAULT 0,
    "totalPrintMtrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceMtrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "efficiencyPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintingDailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrintingDailyReportEntry" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "quality" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "loomNumber" TEXT NOT NULL,
    "productionMeter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "printMeter" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintingDailyReportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PrintingDailyReport_date_shiftName_machineNo_key" ON "PrintingDailyReport"("date", "shiftName", "machineNo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReport_date_idx" ON "PrintingDailyReport"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReport_shiftName_idx" ON "PrintingDailyReport"("shiftName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReport_machineNo_idx" ON "PrintingDailyReport"("machineNo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReport_status_idx" ON "PrintingDailyReport"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReportEntry_reportId_idx" ON "PrintingDailyReportEntry"("reportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReportEntry_rollNumber_idx" ON "PrintingDailyReportEntry"("rollNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReportEntry_quality_idx" ON "PrintingDailyReportEntry"("quality");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReportEntry_loomNumber_idx" ON "PrintingDailyReportEntry"("loomNumber");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PrintingDailyReportEntry_reportId_fkey'
    ) THEN
        ALTER TABLE "PrintingDailyReportEntry" ADD CONSTRAINT "PrintingDailyReportEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PrintingDailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
