import { logEvent } from "@/lib/logging";
import type { ValvomaticInputs } from "@/lib/production/valvomatic-inputs";

type BcsInventoryParams = {
  userId: string;
  bcsRunId: string;
  productionRunId: string;
  inputs: ValvomaticInputs;
  teamMemberIds: string[];
  outputItemId?: string | null;
  outputBagQty: number;
  scrapQty: number;
};

/**
 * P36 integration stub — records intent to consume multi-material inputs and receive finished bags.
 */
export async function postBcsInventoryMovements(params: BcsInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "BCS_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — multi-material OUT and FINISHED_BAGS IN not posted yet",
      intendedMovements: {
        inputs: params.inputs,
        teamMemberIds: params.teamMemberIds,
        finishedBagsIn: params.outputItemId
          ? { itemId: params.outputItemId, qty: params.outputBagQty, materialType: "FINISHED_BAGS" }
          : null,
        scrapQty: params.scrapQty,
      },
      bcsRunId: params.bcsRunId,
      productionRunId: params.productionRunId,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
