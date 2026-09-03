-- CreateTable
CREATE TABLE "ManualStitchProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "workerIds" JSONB NOT NULL DEFAULT '[]',
    "inputMaterialId" TEXT NOT NULL,
    "inputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputBagQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputItemId" TEXT,
    "characteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualStitchProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualStitchProductionRun_productionRunId_key" ON "ManualStitchProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "ManualStitchProductionRun_productionRunId_idx" ON "ManualStitchProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "ManualStitchProductionRun_operatorId_idx" ON "ManualStitchProductionRun"("operatorId");

-- CreateIndex
CREATE INDEX "ManualStitchProductionRun_inputMaterialId_idx" ON "ManualStitchProductionRun"("inputMaterialId");

-- CreateIndex
CREATE INDEX "ManualStitchProductionRun_outputItemId_idx" ON "ManualStitchProductionRun"("outputItemId");

-- AddForeignKey
ALTER TABLE "ManualStitchProductionRun" ADD CONSTRAINT "ManualStitchProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualStitchProductionRun" ADD CONSTRAINT "ManualStitchProductionRun_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualStitchProductionRun" ADD CONSTRAINT "ManualStitchProductionRun_inputMaterialId_fkey" FOREIGN KEY ("inputMaterialId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualStitchProductionRun" ADD CONSTRAINT "ManualStitchProductionRun_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
