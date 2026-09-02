-- CreateTable
CREATE TABLE "ProductionRun" (
    "id" TEXT NOT NULL,
    "planLineId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "targetQty" DOUBLE PRECISION NOT NULL,
    "actualQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reworkQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scrapQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHandover" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "handoverDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wipNotes" TEXT,
    "machineStatus" TEXT,
    "qualityIssues" TEXT,
    "scrapNotes" TEXT,
    "remarks" TEXT,
    "handedOverById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionRun_planLineId_idx" ON "ProductionRun"("planLineId");

-- CreateIndex
CREATE INDEX "ProductionRun_startedAt_idx" ON "ProductionRun"("startedAt");

-- CreateIndex
CREATE INDEX "ProductionRun_endedAt_idx" ON "ProductionRun"("endedAt");

-- CreateIndex
CREATE INDEX "ShiftHandover_shiftId_idx" ON "ShiftHandover"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftHandover_handoverDate_idx" ON "ShiftHandover"("handoverDate");

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_planLineId_fkey" FOREIGN KEY ("planLineId") REFERENCES "ProductionPlanLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandover" ADD CONSTRAINT "ShiftHandover_handedOverById_fkey" FOREIGN KEY ("handedOverById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
