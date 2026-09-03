-- AlterTable
ALTER TABLE "ProductionRoll" ADD COLUMN "laminationProductionRunId" TEXT,
ADD COLUMN "consumedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LaminationProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "laminationMachineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "inputRollId" TEXT NOT NULL,
    "inputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "characteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaminationProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LaminationProductionRun_productionRunId_key" ON "LaminationProductionRun"("productionRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRoll_laminationProductionRunId_key" ON "ProductionRoll"("laminationProductionRunId");

-- CreateIndex
CREATE INDEX "LaminationProductionRun_productionRunId_idx" ON "LaminationProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "LaminationProductionRun_laminationMachineId_idx" ON "LaminationProductionRun"("laminationMachineId");

-- CreateIndex
CREATE INDEX "LaminationProductionRun_operatorId_idx" ON "LaminationProductionRun"("operatorId");

-- CreateIndex
CREATE INDEX "LaminationProductionRun_inputRollId_idx" ON "LaminationProductionRun"("inputRollId");

-- AddForeignKey
ALTER TABLE "LaminationProductionRun" ADD CONSTRAINT "LaminationProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaminationProductionRun" ADD CONSTRAINT "LaminationProductionRun_laminationMachineId_fkey" FOREIGN KEY ("laminationMachineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaminationProductionRun" ADD CONSTRAINT "LaminationProductionRun_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaminationProductionRun" ADD CONSTRAINT "LaminationProductionRun_inputRollId_fkey" FOREIGN KEY ("inputRollId") REFERENCES "ProductionRoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRoll" ADD CONSTRAINT "ProductionRoll_laminationProductionRunId_fkey" FOREIGN KEY ("laminationProductionRunId") REFERENCES "LaminationProductionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
