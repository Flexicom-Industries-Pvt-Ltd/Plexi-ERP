import { Prisma } from "@/generated/prisma";
import {
  createProductionCorrelationId,
  itemInMovement,
  itemOutMovement,
  postProductionInventoryMovements,
  PRODUCTION_RUN_REFERENCE,
  type ProductionInventoryMovement,
  type ProductionInventoryResult,
} from "@/lib/production/inventory-tx";

type ConvertexInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  convertexRunId: string;
  productionRunId: string;
  inputMaterialId: string;
  inputQty: number;
  outputItemId?: string | null;
  outputBagQty: number;
  productionBatch?: string | null;
  scrapQty: number;
  alreadyPosted?: boolean;
  correlationId?: string;
};

export async function postConvertexInventoryMovements(
  params: ConvertexInventoryParams,
): Promise<ProductionInventoryResult> {
  const correlationId = params.correlationId ?? createProductionCorrelationId(params.productionRunId);

  const movements = [
    itemOutMovement(params.inputMaterialId, params.inputQty, null, "Cut material consumed"),
    itemInMovement(params.outputItemId, params.outputBagQty, params.productionBatch, "Finished bags output"),
  ].filter(Boolean) as ProductionInventoryMovement[];

  return postProductionInventoryMovements({
    tx: params.tx,
    userId: params.userId,
    referenceType: PRODUCTION_RUN_REFERENCE,
    referenceId: params.productionRunId,
    phase: "CONVERTEX",
    correlationId,
    movements,
    skipIfAlreadyPosted: params.alreadyPosted,
  });
}
