-- CreateEnum
CREATE TYPE "ProductionPhase" AS ENUM ('BOBBIN', 'LOOM', 'LAMINATION', 'PRINTING', 'CUTTING', 'CONVERTEX', 'VALVOMATIC', 'BCS', 'MANUAL_STITCH', 'BALING');

-- CreateEnum
CREATE TYPE "ProductionPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionCharacteristicFieldType" AS ENUM ('TEXT', 'NUMBER', 'SELECT', 'BOOLEAN', 'DATE');

-- CreateTable
CREATE TABLE "ProductionPlan" (
    "id" TEXT NOT NULL,
    "planNumber" TEXT NOT NULL,
    "shiftId" TEXT,
    "planDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ProductionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPlanLine" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "phase" "ProductionPhase" NOT NULL,
    "machineId" TEXT,
    "operatorId" TEXT,
    "targetQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionPlanLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionCharacteristicDefinition" (
    "id" TEXT NOT NULL,
    "phase" "ProductionPhase" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "ProductionCharacteristicFieldType" NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionCharacteristicDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionCharacteristicValue" (
    "id" TEXT NOT NULL,
    "planLineId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ProductionCharacteristicValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionPlan_planNumber_key" ON "ProductionPlan"("planNumber");

-- CreateIndex
CREATE INDEX "ProductionPlan_status_idx" ON "ProductionPlan"("status");

-- CreateIndex
CREATE INDEX "ProductionPlan_planDate_idx" ON "ProductionPlan"("planDate");

-- CreateIndex
CREATE INDEX "ProductionPlan_shiftId_idx" ON "ProductionPlan"("shiftId");

-- CreateIndex
CREATE INDEX "ProductionPlanLine_planId_idx" ON "ProductionPlanLine"("planId");

-- CreateIndex
CREATE INDEX "ProductionPlanLine_phase_idx" ON "ProductionPlanLine"("phase");

-- CreateIndex
CREATE INDEX "ProductionPlanLine_machineId_idx" ON "ProductionPlanLine"("machineId");

-- CreateIndex
CREATE INDEX "ProductionCharacteristicDefinition_phase_idx" ON "ProductionCharacteristicDefinition"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionCharacteristicDefinition_phase_key_key" ON "ProductionCharacteristicDefinition"("phase", "key");

-- CreateIndex
CREATE INDEX "ProductionCharacteristicValue_planLineId_idx" ON "ProductionCharacteristicValue"("planLineId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionCharacteristicValue_planLineId_definitionId_key" ON "ProductionCharacteristicValue"("planLineId", "definitionId");

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlanLine" ADD CONSTRAINT "ProductionPlanLine_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ProductionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlanLine" ADD CONSTRAINT "ProductionPlanLine_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlanLine" ADD CONSTRAINT "ProductionPlanLine_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionCharacteristicValue" ADD CONSTRAINT "ProductionCharacteristicValue_planLineId_fkey" FOREIGN KEY ("planLineId") REFERENCES "ProductionPlanLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionCharacteristicValue" ADD CONSTRAINT "ProductionCharacteristicValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ProductionCharacteristicDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
