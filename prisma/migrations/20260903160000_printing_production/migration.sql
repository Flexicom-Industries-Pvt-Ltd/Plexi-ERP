-- AlterTable
ALTER TABLE "ProductionRoll" ADD COLUMN "printingProductionRunId" TEXT;

-- CreateTable
CREATE TABLE "PrintingProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "printingMachineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "inputRollId" TEXT NOT NULL,
    "brand" TEXT,
    "colour" TEXT,
    "artworkRef" TEXT,
    "inkMaterials" JSONB,
    "inputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "characteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintingProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintingProductionRunHelper" (
    "id" TEXT NOT NULL,
    "printingRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintingProductionRunHelper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintingProductionRun_productionRunId_key" ON "PrintingProductionRun"("productionRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRoll_printingProductionRunId_key" ON "ProductionRoll"("printingProductionRunId");

-- CreateIndex
CREATE INDEX "PrintingProductionRun_productionRunId_idx" ON "PrintingProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "PrintingProductionRun_printingMachineId_idx" ON "PrintingProductionRun"("printingMachineId");

-- CreateIndex
CREATE INDEX "PrintingProductionRun_operatorId_idx" ON "PrintingProductionRun"("operatorId");

-- CreateIndex
CREATE INDEX "PrintingProductionRun_inputRollId_idx" ON "PrintingProductionRun"("inputRollId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintingProductionRunHelper_printingRunId_userId_key" ON "PrintingProductionRunHelper"("printingRunId", "userId");

-- CreateIndex
CREATE INDEX "PrintingProductionRunHelper_printingRunId_idx" ON "PrintingProductionRunHelper"("printingRunId");

-- CreateIndex
CREATE INDEX "PrintingProductionRunHelper_userId_idx" ON "PrintingProductionRunHelper"("userId");

-- AddForeignKey
ALTER TABLE "PrintingProductionRun" ADD CONSTRAINT "PrintingProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintingProductionRun" ADD CONSTRAINT "PrintingProductionRun_printingMachineId_fkey" FOREIGN KEY ("printingMachineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintingProductionRun" ADD CONSTRAINT "PrintingProductionRun_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintingProductionRun" ADD CONSTRAINT "PrintingProductionRun_inputRollId_fkey" FOREIGN KEY ("inputRollId") REFERENCES "ProductionRoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintingProductionRunHelper" ADD CONSTRAINT "PrintingProductionRunHelper_printingRunId_fkey" FOREIGN KEY ("printingRunId") REFERENCES "PrintingProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintingProductionRunHelper" ADD CONSTRAINT "PrintingProductionRunHelper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRoll" ADD CONSTRAINT "ProductionRoll_printingProductionRunId_fkey" FOREIGN KEY ("printingProductionRunId") REFERENCES "PrintingProductionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
