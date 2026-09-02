-- CreateTable
CREATE TABLE "BobbinProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "rawMaterialItemId" TEXT NOT NULL,
    "outputItemId" TEXT,
    "inputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bobbinCharacteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BobbinProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BobbinProductionRun_productionRunId_key" ON "BobbinProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "BobbinProductionRun_productionRunId_idx" ON "BobbinProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "BobbinProductionRun_rawMaterialItemId_idx" ON "BobbinProductionRun"("rawMaterialItemId");

-- CreateIndex
CREATE INDEX "BobbinProductionRun_outputItemId_idx" ON "BobbinProductionRun"("outputItemId");

-- AddForeignKey
ALTER TABLE "BobbinProductionRun" ADD CONSTRAINT "BobbinProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobbinProductionRun" ADD CONSTRAINT "BobbinProductionRun_rawMaterialItemId_fkey" FOREIGN KEY ("rawMaterialItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BobbinProductionRun" ADD CONSTRAINT "BobbinProductionRun_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
