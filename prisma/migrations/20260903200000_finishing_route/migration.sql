-- CreateEnum
CREATE TYPE "FinishingRoute" AS ENUM ('CONVERTEX', 'VALVOMATIC', 'BCS', 'MANUAL_STITCH');

-- AlterTable
ALTER TABLE "ProductionPlanLine" ADD COLUMN "finishingRoute" "FinishingRoute";

-- CreateIndex
CREATE INDEX "ProductionPlanLine_finishingRoute_idx" ON "ProductionPlanLine"("finishingRoute");
