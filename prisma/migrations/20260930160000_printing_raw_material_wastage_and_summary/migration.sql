-- CreateTable
CREATE TABLE IF NOT EXISTS "PrintingRawMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT NOT NULL DEFAULT 'INK',
    "unit" TEXT NOT NULL DEFAULT 'LITRE',
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.82,
    "defaultRatio" DOUBLE PRECISION,
    "targetMileage" DOUBLE PRECISION,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintingRawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrintingRawMaterialReport" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "operatorName" TEXT,
    "operatorId" TEXT,
    "supervisorName" TEXT,
    "totalPrintMtrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConsumedLitre" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConsumedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallMileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintingRawMaterialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrintingRawMaterialReportEntry" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "rawMaterialId" TEXT,
    "materialName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'LITRE',
    "consumedLitre" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.82,
    "consumedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratioPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintingRawMaterialReportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrintingWastageReport" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "operatorName" TEXT,
    "operatorId" TEXT,
    "supervisorName" TEXT,
    "totalProductionMtrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProductionKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laminationFabricWasteKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laminationFabricWastePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "printFabricWasteKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "printFabricWastePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWastageKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWastagePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintingWastageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PrintingRawMaterial_name_key" ON "PrintingRawMaterial"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "PrintingRawMaterial_code_key" ON "PrintingRawMaterial"("code");
CREATE INDEX IF NOT EXISTS "PrintingRawMaterial_name_idx" ON "PrintingRawMaterial"("name");
CREATE INDEX IF NOT EXISTS "PrintingRawMaterial_category_idx" ON "PrintingRawMaterial"("category");
CREATE INDEX IF NOT EXISTS "PrintingRawMaterial_isActive_idx" ON "PrintingRawMaterial"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PrintingRawMaterialReport_date_shiftName_key" ON "PrintingRawMaterialReport"("date", "shiftName");
CREATE INDEX IF NOT EXISTS "PrintingRawMaterialReport_date_idx" ON "PrintingRawMaterialReport"("date");
CREATE INDEX IF NOT EXISTS "PrintingRawMaterialReport_shiftName_idx" ON "PrintingRawMaterialReport"("shiftName");
CREATE INDEX IF NOT EXISTS "PrintingRawMaterialReport_status_idx" ON "PrintingRawMaterialReport"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingRawMaterialReportEntry_reportId_idx" ON "PrintingRawMaterialReportEntry"("reportId");
CREATE INDEX IF NOT EXISTS "PrintingRawMaterialReportEntry_materialName_idx" ON "PrintingRawMaterialReportEntry"("materialName");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PrintingWastageReport_date_shiftName_key" ON "PrintingWastageReport"("date", "shiftName");
CREATE INDEX IF NOT EXISTS "PrintingWastageReport_date_idx" ON "PrintingWastageReport"("date");
CREATE INDEX IF NOT EXISTS "PrintingWastageReport_shiftName_idx" ON "PrintingWastageReport"("shiftName");
CREATE INDEX IF NOT EXISTS "PrintingWastageReport_status_idx" ON "PrintingWastageReport"("status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PrintingRawMaterialReportEntry_reportId_fkey'
    ) THEN
        ALTER TABLE "PrintingRawMaterialReportEntry" ADD CONSTRAINT "PrintingRawMaterialReportEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PrintingRawMaterialReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
