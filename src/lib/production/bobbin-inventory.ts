import { logEvent } from "@/lib/logging";

type BobbinInventoryParams = {
  userId: string;
  bobbinRunId: string;
  productionRunId: string;
  rawMaterialItemId: string;
  outputItemId?: string | null;
  inputQty: number;
  outputQty: number;
  scrapQty: number;
};

/**
 * P36 integration stub — records intent to post inventory movements.
 * Full production-inventory integration will replace this in P36.
 */
export async function postBobbinInventoryMovements(params: BobbinInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "BOBBIN_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — raw material OUT and bobbin IN not posted yet",
      intendedMovements: {
        rawMaterialOut: { itemId: params.rawMaterialItemId, qty: params.inputQty },
        bobbinIn: params.outputItemId
          ? { itemId: params.outputItemId, qty: params.outputQty }
          : null,
        scrapQty: params.scrapQty,
      },
      bobbinRunId: params.bobbinRunId,
      productionRunId: params.productionRunId,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
