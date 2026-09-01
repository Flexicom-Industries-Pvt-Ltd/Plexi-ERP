import type { Prisma } from "@/generated/prisma";
import { ItemType, StockMaterialType } from "@/generated/prisma";

const STOCK_TO_ITEM_TYPE: Record<StockMaterialType, ItemType> = {
  RAW_MATERIALS: ItemType.RAW_MATERIAL,
  BOBBINS: ItemType.RAW_MATERIAL,
  PP_ROLLS: ItemType.RAW_MATERIAL,
  LPP_ROLLS: ItemType.RAW_MATERIAL,
  LAMINATED_ROLLS: ItemType.SEMI_FINISHED_GOOD,
  PRINTED_ROLLS: ItemType.SEMI_FINISHED_GOOD,
  CUT_MATERIAL: ItemType.SEMI_FINISHED_GOOD,
  WORK_IN_PROGRESS: ItemType.SEMI_FINISHED_GOOD,
  FINISHED_BAGS: ItemType.FINISHED_GOOD,
  BALES: ItemType.FINISHED_GOOD,
  SCRAP: ItemType.SCRAP,
  RP_GRANULES: ItemType.SCRAP,
  EXTERNAL_MATERIALS: ItemType.RAW_MATERIAL,
};

type TxClient = Prisma.TransactionClient;

export async function resolveInventoryItemFromStock(stockId: string, tx: TxClient) {
  const stock = await tx.stock.findUnique({
    where: { id: stockId },
    include: { uom: true },
  });

  if (!stock) {
    throw new Error(`Stock catalog item ${stockId} not found`);
  }

  if (!stock.isActive) {
    throw new Error(`Stock "${stock.name}" is inactive`);
  }

  const byStockId = await tx.inventoryItem.findUnique({ where: { stockId: stock.id } });
  if (byStockId) return byStockId;

  const byCode = await tx.inventoryItem.findUnique({ where: { code: stock.code } });
  if (byCode) {
    return tx.inventoryItem.update({
      where: { id: byCode.id },
      data: { stockId: stock.id },
    });
  }

  return tx.inventoryItem.create({
    data: {
      code: stock.code,
      name: stock.name,
      description: stock.description,
      itemType: STOCK_TO_ITEM_TYPE[stock.materialType],
      uomId: stock.uomId,
      stockId: stock.id,
      currentStock: 0,
      minimumStock: 0,
      isActive: true,
    },
  });
}
