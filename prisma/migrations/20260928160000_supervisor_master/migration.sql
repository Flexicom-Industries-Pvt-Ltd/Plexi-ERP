-- AlterTable LoomRollCuttingReport
ALTER TABLE "LoomRollCuttingReport" ADD COLUMN IF NOT EXISTS "supervisorId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoomRollCuttingReport_supervisorName_idx" ON "LoomRollCuttingReport"("supervisorName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoomRollCuttingEntry_supervisorSign_idx" ON "LoomRollCuttingEntry"("supervisorSign");

-- CreateTable Supervisor
CREATE TABLE IF NOT EXISTS "Supervisor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "department" TEXT NOT NULL DEFAULT 'LOOM',
    "phone" TEXT,
    "email" TEXT,
    "shiftPreference" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supervisor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Supervisor_code_key" ON "Supervisor"("code");
CREATE INDEX IF NOT EXISTS "Supervisor_name_idx" ON "Supervisor"("name");
CREATE INDEX IF NOT EXISTS "Supervisor_department_isActive_idx" ON "Supervisor"("department", "isActive");
CREATE INDEX IF NOT EXISTS "Supervisor_isActive_idx" ON "Supervisor"("isActive");
