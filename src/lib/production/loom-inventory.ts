import { logEvent } from "@/lib/logging";

type LoomInventoryParams = {
  userId: string;
  loomRunId: string;
  productionRunId: string;
  bobbinItemId?: string | null;
  bobbinIssueQty: number;
  rollItemId?: string | null;
  rollOutputQty: number;
  scrapQty: number;
};

/**
 * P36 integration stub — records intent to issue bobbins and receive rolls.
 */
export async function postLoomInventoryMovements(params: LoomInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "LOOM_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — bobbin OUT and roll IN not posted yet",
      intendedMovements: {
        bobbinOut: params.bobbinItemId
          ? { itemId: params.bobbinItemId, qty: params.bobbinIssueQty }
          : null,
        rollIn: params.rollItemId
          ? { itemId: params.rollItemId, qty: params.rollOutputQty }
          : null,
        scrapQty: params.scrapQty,
      },
      loomRunId: params.loomRunId,
      productionRunId: params.productionRunId,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
