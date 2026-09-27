-- CreateTable
CREATE TABLE "LoomReadingSheet" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "shiftId" TEXT,
    "shiftHours" INTEGER NOT NULL DEFAULT 12,
    "timeSlots" TEXT[] DEFAULT ARRAY['10:00', '12:00', '02:00', '04:00', '06:00', '08:00']::TEXT[],
    "initialTimeSlot" TEXT NOT NULL DEFAULT '08:00',
    "preparedBy" TEXT,
    "checkedBy" TEXT,
    "approvedBy" TEXT,
    "totalLoomProductionMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLoomProductionKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWastageKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runningLoomsCount" INTEGER NOT NULL DEFAULT 0,
    "idleLoomsCount" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomReadingSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoomReadingEntry" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "loomNumber" INTEGER NOT NULL,
    "operatorName" TEXT,
    "size" TEXT,
    "denier" TEXT,
    "qualityType" TEXT,
    "initialReading" DOUBLE PRECISION,
    "r1Reading" DOUBLE PRECISION,
    "r1Prod" DOUBLE PRECISION,
    "r2Reading" DOUBLE PRECISION,
    "r2Prod" DOUBLE PRECISION,
    "r3Reading" DOUBLE PRECISION,
    "r3Prod" DOUBLE PRECISION,
    "r4Reading" DOUBLE PRECISION,
    "r4Prod" DOUBLE PRECISION,
    "r5Reading" DOUBLE PRECISION,
    "r5Prod" DOUBLE PRECISION,
    "r6Reading" DOUBLE PRECISION,
    "r6Prod" DOUBLE PRECISION,
    "totalProduction" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoomReadingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoomReadingSheet_date_shiftName_key" ON "LoomReadingSheet"("date", "shiftName");
CREATE INDEX "LoomReadingSheet_date_idx" ON "LoomReadingSheet"("date");
CREATE INDEX "LoomReadingSheet_shiftName_idx" ON "LoomReadingSheet"("shiftName");
CREATE INDEX "LoomReadingSheet_status_idx" ON "LoomReadingSheet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LoomReadingEntry_sheetId_loomNumber_key" ON "LoomReadingEntry"("sheetId", "loomNumber");
CREATE INDEX "LoomReadingEntry_loomNumber_idx" ON "LoomReadingEntry"("loomNumber");
CREATE INDEX "LoomReadingEntry_status_idx" ON "LoomReadingEntry"("status");

-- AddForeignKey
ALTER TABLE "LoomReadingEntry" ADD CONSTRAINT "LoomReadingEntry_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "LoomReadingSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
