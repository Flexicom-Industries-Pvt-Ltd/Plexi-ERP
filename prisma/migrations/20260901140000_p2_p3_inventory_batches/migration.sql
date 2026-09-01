-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "reservedStock" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN "batchLot" TEXT;

-- CreateTable
CREATE TABLE "InventoryBatch" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchLot" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locationId" TEXT,
    "gateEntryId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryTransaction_batchLot_idx" ON "InventoryTransaction"("batchLot");

-- CreateIndex
CREATE INDEX "InventoryBatch_itemId_idx" ON "InventoryBatch"("itemId");

-- CreateIndex
CREATE INDEX "InventoryBatch_batchLot_idx" ON "InventoryBatch"("batchLot");

-- CreateIndex
CREATE INDEX "InventoryBatch_locationId_idx" ON "InventoryBatch"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBatch_itemId_batchLot_key" ON "InventoryBatch"("itemId", "batchLot");

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
