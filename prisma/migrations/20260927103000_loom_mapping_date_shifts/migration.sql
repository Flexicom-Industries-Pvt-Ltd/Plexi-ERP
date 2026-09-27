-- AlterTable LoomMachineMapping to add allocationDate and activeShifts
ALTER TABLE "LoomMachineMapping"
ADD COLUMN IF NOT EXISTS "allocationDate" TEXT,
ADD COLUMN IF NOT EXISTS "activeShifts" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoomMachineMapping_allocationDate_idx" ON "LoomMachineMapping"("allocationDate");
