-- CreateEnum
CREATE TYPE "RollType" AS ENUM ('PP', 'LPP');

-- CreateTable
CREATE TABLE "LoomAssignment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "assignmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomAssignmentMachine" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,

    CONSTRAINT "LoomAssignmentMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomProductionRun" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "loomMachineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "bobbinItemId" TEXT,
    "bobbinIssueQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rollOutputQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rollType" "RollType",
    "rollItemId" TEXT,
    "characteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoomAssignment_shiftId_idx" ON "LoomAssignment"("shiftId");

-- CreateIndex
CREATE INDEX "LoomAssignment_operatorId_idx" ON "LoomAssignment"("operatorId");

-- CreateIndex
CREATE INDEX "LoomAssignment_assignmentDate_idx" ON "LoomAssignment"("assignmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "LoomAssignmentMachine_assignmentId_machineId_key" ON "LoomAssignmentMachine"("assignmentId", "machineId");

-- CreateIndex
CREATE UNIQUE INDEX "LoomAssignmentMachine_machineId_assignmentId_key" ON "LoomAssignmentMachine"("machineId", "assignmentId");

-- CreateIndex
CREATE INDEX "LoomAssignmentMachine_assignmentId_idx" ON "LoomAssignmentMachine"("assignmentId");

-- CreateIndex
CREATE INDEX "LoomAssignmentMachine_machineId_idx" ON "LoomAssignmentMachine"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "LoomProductionRun_productionRunId_key" ON "LoomProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "LoomProductionRun_productionRunId_idx" ON "LoomProductionRun"("productionRunId");

-- CreateIndex
CREATE INDEX "LoomProductionRun_loomMachineId_idx" ON "LoomProductionRun"("loomMachineId");

-- CreateIndex
CREATE INDEX "LoomProductionRun_operatorId_idx" ON "LoomProductionRun"("operatorId");

-- CreateIndex
CREATE INDEX "LoomProductionRun_bobbinItemId_idx" ON "LoomProductionRun"("bobbinItemId");

-- CreateIndex
CREATE INDEX "LoomProductionRun_rollItemId_idx" ON "LoomProductionRun"("rollItemId");

-- AddForeignKey
ALTER TABLE "LoomAssignment" ADD CONSTRAINT "LoomAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomAssignment" ADD CONSTRAINT "LoomAssignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomAssignmentMachine" ADD CONSTRAINT "LoomAssignmentMachine_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "LoomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomAssignmentMachine" ADD CONSTRAINT "LoomAssignmentMachine_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomProductionRun" ADD CONSTRAINT "LoomProductionRun_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomProductionRun" ADD CONSTRAINT "LoomProductionRun_loomMachineId_fkey" FOREIGN KEY ("loomMachineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomProductionRun" ADD CONSTRAINT "LoomProductionRun_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomProductionRun" ADD CONSTRAINT "LoomProductionRun_bobbinItemId_fkey" FOREIGN KEY ("bobbinItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoomProductionRun" ADD CONSTRAINT "LoomProductionRun_rollItemId_fkey" FOREIGN KEY ("rollItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
