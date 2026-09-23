-- AlterTable
ALTER TABLE "TapePlantTemperatureReading" ADD COLUMN IF NOT EXISTS "operatorName" TEXT,
ADD COLUMN IF NOT EXISTS "operatorId" TEXT;

-- AlterTable
ALTER TABLE "TapePlantDriveParameter" ADD COLUMN IF NOT EXISTS "operatorName" TEXT,
ADD COLUMN IF NOT EXISTS "operatorId" TEXT;

-- AlterTable
ALTER TABLE "TapePlantRawMaterial" ADD COLUMN IF NOT EXISTS "operatorName" TEXT,
ADD COLUMN IF NOT EXISTS "operatorId" TEXT;

-- AlterTable
ALTER TABLE "TapePlantPostProduction" ADD COLUMN IF NOT EXISTS "operatorName" TEXT,
ADD COLUMN IF NOT EXISTS "operatorId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "section" TEXT NOT NULL,
    "sectionName" TEXT,
    "phone" TEXT,
    "shiftPreference" TEXT,
    "designation" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Operator_code_key" ON "Operator"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Operator_section_isActive_idx" ON "Operator"("section", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Operator_name_idx" ON "Operator"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Operator_isActive_idx" ON "Operator"("isActive");
