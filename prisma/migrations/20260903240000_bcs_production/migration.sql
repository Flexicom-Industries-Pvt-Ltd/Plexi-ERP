-- CreateTable
CREATE TABLE "BcsProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "bcsMachineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "teamMemberIds" JSONB NOT NULL DEFAULT '[]',
    "inputs" JSONB NOT NULL,
    "outputBagQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputItemId" TEXT,
    "characteristics" JSONB,
    "bcsRulesSnapshot" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BcsProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BcsProductionRun_productionRunId_key" ON "BcsProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "BcsProductionRun_productionRunId_idx" ON "BcsProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "BcsProductionRun_bcsMachineId_idx" ON "BcsProductionRun"("bcsMachineId");

-- CreateIndex
CREATE INDEX "BcsProductionRun_operatorId_idx" ON "BcsProductionRun"("operatorId");

-- CreateIndex
CREATE INDEX "BcsProductionRun_outputItemId_idx" ON "BcsProductionRun"("outputItemId");

-- AddForeignKey
ALTER TABLE "BcsProductionRun" ADD CONSTRAINT "BcsProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcsProductionRun" ADD CONSTRAINT "BcsProductionRun_bcsMachineId_fkey" FOREIGN KEY ("bcsMachineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcsProductionRun" ADD CONSTRAINT "BcsProductionRun_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BcsProductionRun" ADD CONSTRAINT "BcsProductionRun_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
