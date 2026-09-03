import { Prisma } from "@/generated/prisma";
import {
  createProductionCorrelationId,
  postProductionInventoryMovements,
  PRODUCTION_RUN_REFERENCE,
  resolveRollOutMovement,
  rollInMovement,
  type ProductionInventoryResult,
} from "@/lib/production/inventory-tx";

type LaminationInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  laminationRunId: string;
  productionRunId: string;
  inputRollId: string;
  inputQty: number;
  outputRoll?: {
    inventoryItemId: string | null;
    batchLot: string | null;
    rollNumber: string;
    weight?: number | null;
  } | null;
  outputQty: number;
  scrapQty: number;
  alreadyPosted?: boolean;
  correlationId?: string;
};

export async function postLaminationInventoryMovements(
  params: LaminationInventoryParams,
): Promise<ProductionInventoryResult> {
  const correlationId = params.correlationId ?? createProductionCorrelationId(params.productionRunId);

  const rollOut = await resolveRollOutMovement(params.tx, params.inputRollId, params.inputQty);
  const rollIn = params.outputRoll
    ? rollInMovement(params.outputRoll, params.outputQty || params.outputRoll.weight || 0)
    : null;

  const movements = [rollOut, rollIn].filter(Boolean) as NonNullable<typeof rollOut>[];

  return postProductionInventoryMovements({
    tx: params.tx,
    userId: params.userId,
    referenceType: PRODUCTION_RUN_REFERENCE,
    referenceId: params.productionRunId,
    phase: "LAMINATION",
    correlationId,
    movements,
    skipIfAlreadyPosted: params.alreadyPosted,
  });
}
