-- AlterTable
ALTER TABLE "LaminationProductionReport" ADD COLUMN IF NOT EXISTS "contractorName" TEXT;
ALTER TABLE "LaminationProductionReport" ADD COLUMN IF NOT EXISTS "contractorId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LaminationWastageReport" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "operatorName" TEXT,
    "operatorId" TEXT,
    "contractorName" TEXT,
    "contractorId" TEXT,
    "supervisorName" TEXT,
    "rawMaterialUsedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lumpsWastageKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lumpsWastagePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fabricNetWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fabricWastageKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fabricWastagePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBaseKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWastageKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWastagePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationWastageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LaminationWastageReport_date_shiftName_key" ON "LaminationWastageReport"("date", "shiftName");
CREATE INDEX IF NOT EXISTS "LaminationWastageReport_date_idx" ON "LaminationWastageReport"("date");
CREATE INDEX IF NOT EXISTS "LaminationWastageReport_shiftName_idx" ON "LaminationWastageReport"("shiftName");
CREATE INDEX IF NOT EXISTS "LaminationWastageReport_status_idx" ON "LaminationWastageReport"("status");
