-- CreateTable
CREATE TABLE IF NOT EXISTS "LaminationRawMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationRawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LaminationRawMaterialReport" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "operatorName" TEXT,
    "operatorId" TEXT,
    "supervisorName" TEXT,
    "manualTotalKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "machineTotalKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diffTotalKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationRawMaterialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LaminationRawMaterialReportEntry" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "rawMaterialId" TEXT,
    "materialName" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "manualKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "machineKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diffKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationRawMaterialReportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationRawMaterial_isActive_idx" ON "LaminationRawMaterial"("isActive");
CREATE INDEX IF NOT EXISTS "LaminationRawMaterial_sequence_idx" ON "LaminationRawMaterial"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LaminationRawMaterialReport_date_shiftName_key" ON "LaminationRawMaterialReport"("date", "shiftName");
CREATE INDEX IF NOT EXISTS "LaminationRawMaterialReport_date_idx" ON "LaminationRawMaterialReport"("date");
CREATE INDEX IF NOT EXISTS "LaminationRawMaterialReport_shiftName_idx" ON "LaminationRawMaterialReport"("shiftName");
CREATE INDEX IF NOT EXISTS "LaminationRawMaterialReport_status_idx" ON "LaminationRawMaterialReport"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LaminationRawMaterialReportEntry_reportId_idx" ON "LaminationRawMaterialReportEntry"("reportId");
CREATE INDEX IF NOT EXISTS "LaminationRawMaterialReportEntry_materialName_idx" ON "LaminationRawMaterialReportEntry"("materialName");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LaminationRawMaterialReportEntry_reportId_fkey'
    ) THEN
        ALTER TABLE "LaminationRawMaterialReportEntry" ADD CONSTRAINT "LaminationRawMaterialReportEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LaminationRawMaterialReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Seed default initial lamination raw materials if table is empty
INSERT INTO "LaminationRawMaterial" ("id", "name", "code", "percentage", "unit", "sequence", "isActive", "createdAt", "updatedAt")
SELECT 'seed_lam_rm_01', 'PP Granules (Coating Grade)', 'PP-COAT', 60.0, 'kg', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "LaminationRawMaterial" WHERE "id" = 'seed_lam_rm_01');

INSERT INTO "LaminationRawMaterial" ("id", "name", "code", "percentage", "unit", "sequence", "isActive", "createdAt", "updatedAt")
SELECT 'seed_lam_rm_02', 'LDPE Granules', 'LDPE-01', 25.0, 'kg', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "LaminationRawMaterial" WHERE "id" = 'seed_lam_rm_02');

INSERT INTO "LaminationRawMaterial" ("id", "name", "code", "percentage", "unit", "sequence", "isActive", "createdAt", "updatedAt")
SELECT 'seed_lam_rm_03', 'White Masterbatch (MB)', 'MB-WHITE', 10.0, 'kg', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "LaminationRawMaterial" WHERE "id" = 'seed_lam_rm_03');

INSERT INTO "LaminationRawMaterial" ("id", "name", "code", "percentage", "unit", "sequence", "isActive", "createdAt", "updatedAt")
SELECT 'seed_lam_rm_04', 'Calcium Carbonate (Filler/CC)', 'CC-FILLER', 5.0, 'kg', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "LaminationRawMaterial" WHERE "id" = 'seed_lam_rm_04');
