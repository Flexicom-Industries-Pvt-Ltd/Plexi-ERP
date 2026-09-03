-- CreateTable
CREATE TABLE "ConvertexProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "convertexMachineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "inputMaterialId" TEXT NOT NULL,
    "inputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputBagQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputItemId" TEXT,
    "characteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConvertexProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConvertexProductionRun_productionRunId_key" ON "ConvertexProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "ConvertexProductionRun_productionRunId_idx" ON "ConvertexProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "ConvertexProductionRun_convertexMachineId_idx" ON "ConvertexProductionRun"("convertexMachineId");

-- CreateIndex
CREATE INDEX "ConvertexProductionRun_operatorId_idx" ON "ConvertexProductionRun"("operatorId");

-- CreateIndex
CREATE INDEX "ConvertexProductionRun_inputMaterialId_idx" ON "ConvertexProductionRun"("inputMaterialId");

-- CreateIndex
CREATE INDEX "ConvertexProductionRun_outputItemId_idx" ON "ConvertexProductionRun"("outputItemId");

-- AddForeignKey
ALTER TABLE "ConvertexProductionRun" ADD CONSTRAINT "ConvertexProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConvertexProductionRun" ADD CONSTRAINT "ConvertexProductionRun_convertexMachineId_fkey" FOREIGN KEY ("convertexMachineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConvertexProductionRun" ADD CONSTRAINT "ConvertexProductionRun_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConvertexProductionRun" ADD CONSTRAINT "ConvertexProductionRun_inputMaterialId_fkey" FOREIGN KEY ("inputMaterialId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConvertexProductionRun" ADD CONSTRAINT "ConvertexProductionRun_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
