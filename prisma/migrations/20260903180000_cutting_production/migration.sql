-- CreateTable
CREATE TABLE "CuttingProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "cuttingMachineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "inputRollId" TEXT NOT NULL,
    "cuttingSpec" TEXT,
    "inputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputMaterialQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputItemId" TEXT,
    "characteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuttingProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuttingProductionRun_productionRunId_key" ON "CuttingProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "CuttingProductionRun_productionRunId_idx" ON "CuttingProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "CuttingProductionRun_cuttingMachineId_idx" ON "CuttingProductionRun"("cuttingMachineId");

-- CreateIndex
CREATE INDEX "CuttingProductionRun_operatorId_idx" ON "CuttingProductionRun"("operatorId");

-- CreateIndex
CREATE INDEX "CuttingProductionRun_inputRollId_idx" ON "CuttingProductionRun"("inputRollId");

-- CreateIndex
CREATE INDEX "CuttingProductionRun_outputItemId_idx" ON "CuttingProductionRun"("outputItemId");

-- AddForeignKey
ALTER TABLE "CuttingProductionRun" ADD CONSTRAINT "CuttingProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingProductionRun" ADD CONSTRAINT "CuttingProductionRun_cuttingMachineId_fkey" FOREIGN KEY ("cuttingMachineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingProductionRun" ADD CONSTRAINT "CuttingProductionRun_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingProductionRun" ADD CONSTRAINT "CuttingProductionRun_inputRollId_fkey" FOREIGN KEY ("inputRollId") REFERENCES "ProductionRoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingProductionRun" ADD CONSTRAINT "CuttingProductionRun_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
