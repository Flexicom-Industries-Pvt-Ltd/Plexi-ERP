-- AlterTable TapePlantPostProduction
ALTER TABLE "TapePlantPostProduction" ADD COLUMN IF NOT EXISTS "entries" JSONB NOT NULL DEFAULT '[]';

-- AlterIndex TapePlantPlan
DROP INDEX IF EXISTS "TapePlantPlan_date_shiftId_key";
CREATE INDEX IF NOT EXISTS "TapePlantPlan_date_shiftId_idx" ON "TapePlantPlan"("date", "shiftId");
