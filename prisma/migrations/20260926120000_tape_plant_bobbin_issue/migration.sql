-- CreateTable TapePlantBobbinIssue
CREATE TABLE IF NOT EXISTS "TapePlantBobbinIssue" (
    "id" TEXT NOT NULL,
    "slipNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftId" TEXT,
    "shiftName" TEXT,
    "recipeQuality" TEXT NOT NULL,
    "loomNumber" INTEGER,
    "loomIdentifier" TEXT,
    "crateCount" DOUBLE PRECISION NOT NULL,
    "bobbinCount" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "issuedBy" TEXT,
    "receivedBy" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapePlantBobbinIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TapePlantBobbinIssue_slipNumber_key" ON "TapePlantBobbinIssue"("slipNumber");
CREATE INDEX IF NOT EXISTS "TapePlantBobbinIssue_date_idx" ON "TapePlantBobbinIssue"("date");
CREATE INDEX IF NOT EXISTS "TapePlantBobbinIssue_shiftId_idx" ON "TapePlantBobbinIssue"("shiftId");
CREATE INDEX IF NOT EXISTS "TapePlantBobbinIssue_recipeQuality_idx" ON "TapePlantBobbinIssue"("recipeQuality");
CREATE INDEX IF NOT EXISTS "TapePlantBobbinIssue_loomNumber_idx" ON "TapePlantBobbinIssue"("loomNumber");
CREATE INDEX IF NOT EXISTS "TapePlantBobbinIssue_slipNumber_idx" ON "TapePlantBobbinIssue"("slipNumber");
CREATE INDEX IF NOT EXISTS "TapePlantBobbinIssue_status_idx" ON "TapePlantBobbinIssue"("status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TapePlantBobbinIssue_shiftId_fkey'
    ) THEN
        ALTER TABLE "TapePlantBobbinIssue" ADD CONSTRAINT "TapePlantBobbinIssue_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
