-- Link inventory items to Data Centre stock catalog for gate receipt mapping.
ALTER TABLE "InventoryItem" ADD COLUMN "stockId" TEXT;

CREATE UNIQUE INDEX "InventoryItem_stockId_key" ON "InventoryItem"("stockId");
CREATE INDEX "InventoryItem_stockId_idx" ON "InventoryItem"("stockId");

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
