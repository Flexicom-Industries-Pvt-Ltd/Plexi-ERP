-- CreateEnum
CREATE TYPE "StockMaterialType" AS ENUM ('RAW_MATERIALS', 'BOBBINS', 'PP_ROLLS', 'LPP_ROLLS', 'LAMINATED_ROLLS', 'PRINTED_ROLLS', 'CUT_MATERIAL', 'WORK_IN_PROGRESS', 'FINISHED_BAGS', 'BALES', 'SCRAP', 'RP_GRANULES', 'EXTERNAL_MATERIALS');

-- AlterTable
ALTER TABLE "TruckStockDetail" ADD COLUMN     "stockId" TEXT;

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "materialType" "StockMaterialType" NOT NULL,
    "uomId" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_code_key" ON "Stock"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_name_key" ON "Stock"("name");

-- CreateIndex
CREATE INDEX "Stock_materialType_idx" ON "Stock"("materialType");

-- CreateIndex
CREATE INDEX "Stock_uomId_idx" ON "Stock"("uomId");

-- CreateIndex
CREATE INDEX "TruckStockDetail_stockId_idx" ON "TruckStockDetail"("stockId");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "UnitOfMeasurement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckStockDetail" ADD CONSTRAINT "TruckStockDetail_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
