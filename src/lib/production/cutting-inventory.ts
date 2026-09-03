import { Prisma } from "@/generated/prisma";
import {
  createProductionCorrelationId,
  itemInMovement,
  postProductionInventoryMovements,
  PRODUCTION_RUN_REFERENCE,
  resolveRollOutMovement,
  type ProductionInventoryResult,
} from "@/lib/production/inventory-tx";

type CuttingInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  cuttingRunId: string;
  productionRunId: string;
  inputRollId: string;
  inputQty: number;
  outputItemId?: string | null;
  outputMaterialQty: number;
  productionBatch?: string | null;
  scrapQty: number;
  alreadyPosted?: boolean;
  correlationId?: string;
};

export async function postCuttingInventoryMovements(
  params: CuttingInventoryParams,
): Promise<ProductionInventoryResult> {
  const correlationId = params.correlationId ?? createProductionCorrelationId(params.productionRunId);

  const rollOut = await resolveRollOutMovement(params.tx, params.inputRollId, params.inputQty, "Printed roll");
  const cutMaterialIn = itemInMovement(
    params.outputItemId,
    params.outputMaterialQty,
    params.productionBatch,
    "Cut material output",
  );

  const movements = [rollOut, cutMaterialIn].filter(Boolean) as NonNullable<typeof rollOut>[];

  return postProductionInventoryMovements({
    tx: params.tx,
    userId: params.userId,
    referenceType: PRODUCTION_RUN_REFERENCE,
    referenceId: params.productionRunId,
    phase: "CUTTING",
    correlationId,
    movements,
    skipIfAlreadyPosted: params.alreadyPosted,
  });
}
