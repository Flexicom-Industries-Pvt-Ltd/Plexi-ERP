import { logEvent } from "@/lib/logging";

type LaminationInventoryParams = {
  userId: string;
  laminationRunId: string;
  productionRunId: string;
  inputRollId: string;
  inputQty: number;
  outputRollId?: string | null;
  outputQty: number;
  scrapQty: number;
};

/**
 * P36 integration stub — records intent to consume input roll and receive laminated roll.
 */
export async function postLaminationInventoryMovements(params: LaminationInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "LAMINATION_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — input roll OUT and laminated roll IN not posted yet",
      intendedMovements: {
        inputRollOut: { rollId: params.inputRollId, qty: params.inputQty },
        laminatedRollIn: params.outputRollId
          ? { rollId: params.outputRollId, qty: params.outputQty }
          : null,
        scrapQty: params.scrapQty,
      },
      laminationRunId: params.laminationRunId,
      productionRunId: params.productionRunId,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
