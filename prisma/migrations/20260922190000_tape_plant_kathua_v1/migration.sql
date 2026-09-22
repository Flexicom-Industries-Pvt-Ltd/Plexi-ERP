-- CreateTable TapePlantPlan
CREATE TABLE IF NOT EXISTS "TapePlantPlan" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "recipeQuality" TEXT NOT NULL,
    "tapeType" TEXT,
    "denier" DOUBLE PRECISION,
    "tapeWidth" DOUBLE PRECISION,
    "strength" DOUBLE PRECISION,
    "eloPercent" DOUBLE PRECISION,
    "bobbinMarking" TEXT,
    "colour" TEXT,
    "spacerSize" TEXT,
    "requiredAsh" DOUBLE PRECISION,
    "ashPercent" DOUBLE PRECISION,
    "plannedQtyKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "omega" TEXT,
    "vistPercent" DOUBLE PRECISION,
    "remarks" TEXT,
    "materials" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapePlantPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable TapePlantTemperatureReading
CREATE TABLE IF NOT EXISTS "TapePlantTemperatureReading" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "b1" DOUBLE PRECISION,
    "b2" DOUBLE PRECISION,
    "b3" DOUBLE PRECISION,
    "b4" DOUBLE PRECISION,
    "b5" DOUBLE PRECISION,
    "b6" DOUBLE PRECISION,
    "b7" DOUBLE PRECISION,
    "screenChanger" DOUBLE PRECISION,
    "ad1" DOUBLE PRECISION,
    "ad2" DOUBLE PRECISION,
    "meltPump" DOUBLE PRECISION,
    "d1" DOUBLE PRECISION,
    "d2" DOUBLE PRECISION,
    "d3" DOUBLE PRECISION,
    "d4" DOUBLE PRECISION,
    "d5" DOUBLE PRECISION,
    "d6" DOUBLE PRECISION,
    "d7" DOUBLE PRECISION,
    "housingWater" DOUBLE PRECISION,
    "hotAirTemp" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapePlantTemperatureReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable TapePlantDriveParameter
CREATE TABLE IF NOT EXISTS "TapePlantDriveParameter" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "extruderRpm" DOUBLE PRECISION,
    "meltPumpRpm" DOUBLE PRECISION,
    "takeUpMpm" DOUBLE PRECISION,
    "nipRollMpm" DOUBLE PRECISION,
    "isuMpm" DOUBLE PRECISION,
    "pauMpm" DOUBLE PRECISION,
    "stretchingMpm" DOUBLE PRECISION,
    "annealingMpm" DOUBLE PRECISION,
    "stretchingRatio" DOUBLE PRECISION,
    "meltPressureP1" DOUBLE PRECISION,
    "meltPressureP2" DOUBLE PRECISION,
    "meltPressureP3" DOUBLE PRECISION,
    "waterBath" DOUBLE PRECISION,
    "colour" TEXT,
    "denier" DOUBLE PRECISION,
    "tapeWidth" DOUBLE PRECISION,
    "strength" DOUBLE PRECISION,
    "eloPercent" DOUBLE PRECISION,
    "spacerWidth" DOUBLE PRECISION,
    "numberOfTape" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapePlantDriveParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable TapePlantRawMaterial
CREATE TABLE IF NOT EXISTS "TapePlantRawMaterial" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "grade" TEXT,
    "openingStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "received" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consumption" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "settingPercent" DOUBLE PRECISION,
    "actualPercent" DOUBLE PRECISION,
    "wastage" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapePlantRawMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable TapePlantPostProduction
CREATE TABLE IF NOT EXISTS "TapePlantPostProduction" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "recipeQuality" TEXT,
    "plannedProductionKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productionDoneKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gapKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasteKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastePercent" DOUBLE PRECISION,
    "netProductionKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityChecks" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapePlantPostProduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TapePlantPlan_date_shiftId_key" ON "TapePlantPlan"("date", "shiftId");
CREATE INDEX IF NOT EXISTS "TapePlantPlan_date_idx" ON "TapePlantPlan"("date");
CREATE INDEX IF NOT EXISTS "TapePlantPlan_shiftId_idx" ON "TapePlantPlan"("shiftId");

CREATE INDEX IF NOT EXISTS "TapePlantTemperatureReading_date_shiftId_idx" ON "TapePlantTemperatureReading"("date", "shiftId");
CREATE INDEX IF NOT EXISTS "TapePlantDriveParameter_date_shiftId_idx" ON "TapePlantDriveParameter"("date", "shiftId");
CREATE INDEX IF NOT EXISTS "TapePlantRawMaterial_date_shiftId_idx" ON "TapePlantRawMaterial"("date", "shiftId");

CREATE UNIQUE INDEX IF NOT EXISTS "TapePlantPostProduction_date_shiftId_key" ON "TapePlantPostProduction"("date", "shiftId");
CREATE INDEX IF NOT EXISTS "TapePlantPostProduction_date_idx" ON "TapePlantPostProduction"("date");
CREATE INDEX IF NOT EXISTS "TapePlantPostProduction_shiftId_idx" ON "TapePlantPostProduction"("shiftId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TapePlantPlan_shiftId_fkey') THEN
        ALTER TABLE "TapePlantPlan" ADD CONSTRAINT "TapePlantPlan_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TapePlantTemperatureReading_shiftId_fkey') THEN
        ALTER TABLE "TapePlantTemperatureReading" ADD CONSTRAINT "TapePlantTemperatureReading_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TapePlantDriveParameter_shiftId_fkey') THEN
        ALTER TABLE "TapePlantDriveParameter" ADD CONSTRAINT "TapePlantDriveParameter_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TapePlantRawMaterial_shiftId_fkey') THEN
        ALTER TABLE "TapePlantRawMaterial" ADD CONSTRAINT "TapePlantRawMaterial_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TapePlantPostProduction_shiftId_fkey') THEN
        ALTER TABLE "TapePlantPostProduction" ADD CONSTRAINT "TapePlantPostProduction_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
