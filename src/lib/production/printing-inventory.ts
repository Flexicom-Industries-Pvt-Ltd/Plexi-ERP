import { logEvent } from "@/lib/logging";

type PrintingInventoryParams = {
  userId: string;
  printingRunId: string;
  productionRunId: string;
  inputRollId: string;
  inputQty: number;
  outputRollId?: string | null;
  outputQty: number;
  inkMaterials: unknown;
  scrapQty: number;
};

/**
 * P36 integration stub — records intent to consume input roll, ink/reducer, and receive printed roll.
 */
export async function postPrintingInventoryMovements(params: PrintingInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "PRINTING_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — roll and material movements not posted yet",
      intendedMovements: {
        inputRollOut: { rollId: params.inputRollId, qty: params.inputQty },
        printedRollIn: params.outputRollId
          ? { rollId: params.outputRollId, qty: params.outputQty }
          : null,
        inkMaterials: params.inkMaterials,
        scrapQty: params.scrapQty,
      },
      printingRunId: params.printingRunId,
      productionRunId: params.productionRunId,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
