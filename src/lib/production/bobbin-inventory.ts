import { Prisma } from "@/generated/prisma";
import {
  createProductionCorrelationId,
  itemInMovement,
  itemOutMovement,
  postProductionInventoryMovements,
  PRODUCTION_RUN_REFERENCE,
  type ProductionInventoryResult,
} from "@/lib/production/inventory-tx";

type BobbinInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  bobbinRunId: string;
  productionRunId: string;
  rawMaterialItemId: string;
  outputItemId?: string | null;
  inputQty: number;
  outputQty: number;
  scrapQty: number;
  alreadyPosted?: boolean;
  correlationId?: string;
};

export async function postBobbinInventoryMovements(
  params: BobbinInventoryParams,
): Promise<ProductionInventoryResult> {
  const correlationId = params.correlationId ?? createProductionCorrelationId(params.productionRunId);

  const movements = [
    itemOutMovement(params.rawMaterialItemId, params.inputQty, null, "Raw material consumed"),
    itemInMovement(params.outputItemId, params.outputQty, null, "Bobbin output"),
  ].filter(Boolean) as NonNullable<ReturnType<typeof itemOutMovement>>[];

  return postProductionInventoryMovements({
    tx: params.tx,
    userId: params.userId,
    referenceType: PRODUCTION_RUN_REFERENCE,
    referenceId: params.productionRunId,
    phase: "BOBBIN",
    correlationId,
    movements,
    skipIfAlreadyPosted: params.alreadyPosted,
  });
}
