-- AlterTable
ALTER TABLE "PrintingDailyReportEntry" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "PrintingDailyReportEntry" ADD COLUMN IF NOT EXISTS "unitName" TEXT;
ALTER TABLE "PrintingDailyReportEntry" ADD COLUMN IF NOT EXISTS "grade" TEXT;
ALTER TABLE "PrintingDailyReportEntry" ADD COLUMN IF NOT EXISTS "targetProductionMtrs" DOUBLE PRECISION;
ALTER TABLE "PrintingDailyReportEntry" ADD COLUMN IF NOT EXISTS "drumSize" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PartyPrintingDetail" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "unitName" TEXT,
    "grade" TEXT,
    "drumSize" TEXT,
    "targetProductionMtrs" DOUBLE PRECISION,
    "quality" TEXT,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyPrintingDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrintingDailyReportEntry_companyName_idx" ON "PrintingDailyReportEntry"("companyName");
CREATE INDEX IF NOT EXISTS "PartyPrintingDetail_companyName_idx" ON "PartyPrintingDetail"("companyName");
CREATE INDEX IF NOT EXISTS "PartyPrintingDetail_unitName_idx" ON "PartyPrintingDetail"("unitName");
CREATE INDEX IF NOT EXISTS "PartyPrintingDetail_grade_idx" ON "PartyPrintingDetail"("grade");
CREATE INDEX IF NOT EXISTS "PartyPrintingDetail_drumSize_idx" ON "PartyPrintingDetail"("drumSize");
CREATE INDEX IF NOT EXISTS "PartyPrintingDetail_isActive_idx" ON "PartyPrintingDetail"("isActive");
