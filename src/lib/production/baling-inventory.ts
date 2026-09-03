import { Prisma } from "@/generated/prisma";
import {
  BALE_REFERENCE,
  createBaleCorrelationId,
  itemInMovement,
  itemOutMovement,
  postProductionInventoryMovements,
  type ProductionInventoryMovement,
  type ProductionInventoryResult,
} from "@/lib/production/inventory-tx";

type BalingInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  baleId: string;
  baleNumber: string;
  productId: string;
  bagQty: number;
  baleItemId?: string | null;
  productionBatch?: string | null;
  alreadyPosted?: boolean;
  correlationId?: string;
};

export async function postBalingInventoryMovements(
  params: BalingInventoryParams,
): Promise<ProductionInventoryResult> {
  const correlationId = params.correlationId ?? createBaleCorrelationId(params.baleId);

  const movements = [
    itemOutMovement(params.productId, params.bagQty, params.productionBatch, "Finished bags baled"),
    itemInMovement(params.baleItemId, 1, params.productionBatch, `Bale ${params.baleNumber}`),
  ].filter(Boolean) as ProductionInventoryMovement[];

  return postProductionInventoryMovements({
    tx: params.tx,
    userId: params.userId,
    referenceType: BALE_REFERENCE,
    referenceId: params.baleId,
    phase: "BALING",
    correlationId,
    movements,
    skipIfAlreadyPosted: params.alreadyPosted,
  });
}
