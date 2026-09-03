-- CreateEnum
CREATE TYPE "RollQualityStatus" AS ENUM ('PENDING_QC', 'PASSED', 'FAILED', 'REWORK', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ProductionRollSourcePhase" AS ENUM ('LOOM', 'LAMINATION', 'PRINTING');

-- CreateTable
CREATE TABLE "ProductionRoll" (
    "id" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "rollType" "RollType" NOT NULL,
    "characteristics" JSONB,
    "weight" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "batchLot" TEXT,
    "locationId" TEXT,
    "qualityStatus" "RollQualityStatus" NOT NULL DEFAULT 'PENDING_QC',
    "inventoryItemId" TEXT,
    "sourcePhase" "ProductionRollSourcePhase" NOT NULL DEFAULT 'LOOM',
    "loomProductionRunId" TEXT,
    "productionRunId" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRoll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRoll_rollNumber_key" ON "ProductionRoll"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRoll_loomProductionRunId_key" ON "ProductionRoll"("loomProductionRunId");

-- CreateIndex
CREATE INDEX "ProductionRoll_rollType_idx" ON "ProductionRoll"("rollType");

-- CreateIndex
CREATE INDEX "ProductionRoll_qualityStatus_idx" ON "ProductionRoll"("qualityStatus");

-- CreateIndex
CREATE INDEX "ProductionRoll_locationId_idx" ON "ProductionRoll"("locationId");

-- CreateIndex
CREATE INDEX "ProductionRoll_inventoryItemId_idx" ON "ProductionRoll"("inventoryItemId");

-- CreateIndex
CREATE INDEX "ProductionRoll_productionRunId_idx" ON "ProductionRoll"("productionRunId");

-- CreateIndex
CREATE INDEX "ProductionRoll_createdAt_idx" ON "ProductionRoll"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductionRoll" ADD CONSTRAINT "ProductionRoll_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRoll" ADD CONSTRAINT "ProductionRoll_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRoll" ADD CONSTRAINT "ProductionRoll_loomProductionRunId_fkey" FOREIGN KEY ("loomProductionRunId") REFERENCES "LoomProductionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRoll" ADD CONSTRAINT "ProductionRoll_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
