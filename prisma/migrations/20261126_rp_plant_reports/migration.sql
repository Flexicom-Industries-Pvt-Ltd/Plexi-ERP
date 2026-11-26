-- Additive Migration: Recycling Plant (RP) Wastage Collection & Production Reports

CREATE TABLE IF NOT EXISTS "RpWastageCollectionReport" (
    "id" TEXT NOT NULL,
    "serialNo" INTEGER NOT NULL DEFAULT 1,
    "date" TEXT NOT NULL,
    "shiftNames" JSONB NOT NULL DEFAULT '[]',
    "operatorName" TEXT,
    "operatorId" TEXT,
    "supervisorName" TEXT,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "marginBlocks" JSONB NOT NULL DEFAULT '{}',
    "summaryTotalKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotalKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RpWastageCollectionReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RpWastageCollectionReport_date_key" ON "RpWastageCollectionReport"("date");
CREATE INDEX IF NOT EXISTS "RpWastageCollectionReport_status_idx" ON "RpWastageCollectionReport"("status");
CREATE INDEX IF NOT EXISTS "RpWastageCollectionReport_serialNo_idx" ON "RpWastageCollectionReport"("serialNo");

CREATE TABLE IF NOT EXISTS "RpProductionReport" (
    "id" TEXT NOT NULL,
    "serialNo" INTEGER NOT NULL DEFAULT 1,
    "date" TEXT NOT NULL,
    "shiftNames" JSONB NOT NULL DEFAULT '[]',
    "operatorName" TEXT,
    "operatorId" TEXT,
    "supervisorName" TEXT,
    "rows" JSONB NOT NULL DEFAULT '[]',
    "totalOpeningStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProductionOnDate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProductionMtd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalIssuedToTapePlant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalIssuedToTapePlantMtd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLumpsOnDate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLumpsMtd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDispatchOnDate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDispatchMtd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalClosingStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RpProductionReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RpProductionReport_date_key" ON "RpProductionReport"("date");
CREATE INDEX IF NOT EXISTS "RpProductionReport_status_idx" ON "RpProductionReport"("status");
CREATE INDEX IF NOT EXISTS "RpProductionReport_serialNo_idx" ON "RpProductionReport"("serialNo");
