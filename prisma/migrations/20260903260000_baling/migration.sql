-- CreateTable
CREATE TABLE "Bale" (
    "id" TEXT NOT NULL,
    "baleNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "baleItemId" TEXT,
    "bagsPerBale" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "productionBatch" TEXT,
    "qualityStatus" "RollQualityStatus" NOT NULL DEFAULT 'PENDING_QC',
    "shiftId" TEXT NOT NULL,
    "characteristics" JSONB,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "baledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bale_baleNumber_key" ON "Bale"("baleNumber");

-- CreateIndex
CREATE INDEX "Bale_productId_idx" ON "Bale"("productId");

-- CreateIndex
CREATE INDEX "Bale_baleItemId_idx" ON "Bale"("baleItemId");

-- CreateIndex
CREATE INDEX "Bale_shiftId_idx" ON "Bale"("shiftId");

-- CreateIndex
CREATE INDEX "Bale_qualityStatus_idx" ON "Bale"("qualityStatus");

-- CreateIndex
CREATE INDEX "Bale_baledAt_idx" ON "Bale"("baledAt");

-- AddForeignKey
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_baleItemId_fkey" FOREIGN KEY ("baleItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
