import { logEvent } from "@/lib/logging";

type BalingInventoryParams = {
  userId: string;
  baleId: string;
  baleNumber: string;
  productId: string;
  bagQty: number;
  baleItemId?: string | null;
  baleQty: number;
};

/**
 * P36 integration stub — records intent to consume finished bags and receive bales stock.
 */
export async function postBalingInventoryMovements(params: BalingInventoryParams) {
  await logEvent({
    userId: params.userId,
    module: "PRODUCTION",
    severity: "INFO",
    action: "BALING_INVENTORY_STUB",
    payload: {
      note: "P36 integration pending — FINISHED_BAGS OUT and BALES IN not posted yet",
      intendedMovements: {
        finishedBagsOut: { itemId: params.productId, qty: params.bagQty, materialType: "FINISHED_BAGS" },
        balesIn: params.baleItemId
          ? { itemId: params.baleItemId, qty: params.baleQty, materialType: "BALES" }
          : null,
      },
      baleId: params.baleId,
      baleNumber: params.baleNumber,
    },
  });

  return {
    posted: false,
    message: "Inventory posting deferred to P36 integration",
  };
}
