-- AlterTable LoomRollCuttingEntry
ALTER TABLE "LoomRollCuttingEntry" ADD COLUMN IF NOT EXISTS "contractor" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LoomRollCuttingEntry_contractor_idx" ON "LoomRollCuttingEntry"("contractor");

-- CreateTable Contractor
CREATE TABLE IF NOT EXISTS "Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "section" TEXT NOT NULL DEFAULT 'LOOM',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Contractor_code_key" ON "Contractor"("code");
CREATE INDEX IF NOT EXISTS "Contractor_name_idx" ON "Contractor"("name");
CREATE INDEX IF NOT EXISTS "Contractor_section_isActive_idx" ON "Contractor"("section", "isActive");
CREATE INDEX IF NOT EXISTS "Contractor_isActive_idx" ON "Contractor"("isActive");
