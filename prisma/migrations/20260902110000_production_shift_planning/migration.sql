-- AlterTable
ALTER TABLE "ProductionPlanLine" ADD COLUMN "inventoryItemId" TEXT;

-- CreateTable
CREATE TABLE "ProductionPlanLineOperator" (
    "id" TEXT NOT NULL,
    "planLineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionPlanLineOperator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionPlanLine_inventoryItemId_idx" ON "ProductionPlanLine"("inventoryItemId");

-- CreateIndex
CREATE INDEX "ProductionPlanLineOperator_planLineId_idx" ON "ProductionPlanLineOperator"("planLineId");

-- CreateIndex
CREATE INDEX "ProductionPlanLineOperator_userId_idx" ON "ProductionPlanLineOperator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionPlanLineOperator_planLineId_userId_key" ON "ProductionPlanLineOperator"("planLineId", "userId");

-- AddForeignKey
ALTER TABLE "ProductionPlanLine" ADD CONSTRAINT "ProductionPlanLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlanLineOperator" ADD CONSTRAINT "ProductionPlanLineOperator_planLineId_fkey" FOREIGN KEY ("planLineId") REFERENCES "ProductionPlanLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlanLineOperator" ADD CONSTRAINT "ProductionPlanLineOperator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
