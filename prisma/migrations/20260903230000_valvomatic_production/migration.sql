-- CreateTable
CREATE TABLE "ValvomaticProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "valvomaticMachineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "outputBagQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputItemId" TEXT,
    "characteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValvomaticProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValvomaticProductionRun_productionRunId_key" ON "ValvomaticProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "ValvomaticProductionRun_productionRunId_idx" ON "ValvomaticProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "ValvomaticProductionRun_valvomaticMachineId_idx" ON "ValvomaticProductionRun"("valvomaticMachineId");

-- CreateIndex
CREATE INDEX "ValvomaticProductionRun_operatorId_idx" ON "ValvomaticProductionRun"("operatorId");

-- CreateIndex
CREATE INDEX "ValvomaticProductionRun_outputItemId_idx" ON "ValvomaticProductionRun"("outputItemId");

-- AddForeignKey
ALTER TABLE "ValvomaticProductionRun" ADD CONSTRAINT "ValvomaticProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValvomaticProductionRun" ADD CONSTRAINT "ValvomaticProductionRun_valvomaticMachineId_fkey" FOREIGN KEY ("valvomaticMachineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValvomaticProductionRun" ADD CONSTRAINT "ValvomaticProductionRun_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValvomaticProductionRun" ADD CONSTRAINT "ValvomaticProductionRun_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
