import { logEvent } from "@/lib/logging";

type CuttingInventoryParams = {
  userId: string;
  cuttingRunId: string;
  productionRunId: string;
  inputRollId: string;
  inputQty: number;
  outputItemId?: string | null;
  outputMaterialQty: number;
  scrapQty: number;
};

/**
 * P36 integration stub — records intent to consume printed roll and receive cut material.
 */
export async function postCuttingInventoryMovements(params: CuttingInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "CUTTING_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — printed roll OUT and CUT_MATERIAL IN not posted yet",
      intendedMovements: {
        printedRollOut: { rollId: params.inputRollId, qty: params.inputQty },
        cutMaterialIn: params.outputItemId
          ? { itemId: params.outputItemId, qty: params.outputMaterialQty, materialType: "CUT_MATERIAL" }
          : null,
        scrapQty: params.scrapQty,
      },
      cuttingRunId: params.cuttingRunId,
      productionRunId: params.productionRunId,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
