import { logEvent } from "@/lib/logging";

type ConvertexInventoryParams = {
  userId: string;
  convertexRunId: string;
  productionRunId: string;
  inputMaterialId: string;
  inputQty: number;
  outputItemId?: string | null;
  outputBagQty: number;
  scrapQty: number;
};

/**
 * P36 integration stub — records intent to consume cut material and receive finished bags.
 */
export async function postConvertexInventoryMovements(params: ConvertexInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "CONVERTEX_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — CUT_MATERIAL OUT and FINISHED_BAGS IN not posted yet",
      intendedMovements: {
        cutMaterialOut: { itemId: params.inputMaterialId, qty: params.inputQty },
        finishedBagsIn: params.outputItemId
          ? { itemId: params.outputItemId, qty: params.outputBagQty, materialType: "FINISHED_BAGS" }
          : null,
        scrapQty: params.scrapQty,
      },
      convertexRunId: params.convertexRunId,
      productionRunId: params.productionRunId,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
