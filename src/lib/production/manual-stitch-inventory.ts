import { logEvent } from "@/lib/logging";

type ManualStitchInventoryParams = {
  userId: string;
  manualStitchRunId: string;
  productionRunId: string;
  inputMaterialId: string;
  inputQty: number;
  workerIds: string[];
  outputItemId?: string | null;
  outputBagQty: number;
  scrapQty: number;
};

/**
 * P36 integration stub — records intent to consume cut material and receive finished bags.
 */
export async function postManualStitchInventoryMovements(params: ManualStitchInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "MANUAL_STITCH_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — CUT_MATERIAL OUT and FINISHED_BAGS IN not posted yet",
      intendedMovements: {
        cutMaterialOut: { itemId: params.inputMaterialId, qty: params.inputQty },
        finishedBagsIn: params.outputItemId
          ? { itemId: params.outputItemId, qty: params.outputBagQty, materialType: "FINISHED_BAGS" }
          : null,
        workerIds: params.workerIds,
        scrapQty: params.scrapQty,
      },
      manualStitchRunId: params.manualStitchRunId,
      productionRunId: params.productionRunId,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
