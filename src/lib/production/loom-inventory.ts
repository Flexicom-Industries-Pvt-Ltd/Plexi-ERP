import { Prisma } from "@/generated/prisma";
import {
  createProductionCorrelationId,
  itemInMovement,
  itemOutMovement,
  postProductionInventoryMovements,
  PRODUCTION_RUN_REFERENCE,
  type ProductionInventoryResult,
} from "@/lib/production/inventory-tx";

type LoomInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  loomRunId: string;
  productionRunId: string;
  bobbinItemId?: string | null;
  bobbinIssueQty: number;
  rollItemId?: string | null;
  rollOutputQty: number;
  outputRoll?: {
    inventoryItemId: string | null;
    batchLot: string | null;
    rollNumber: string;
    weight?: number | null;
  } | null;
  scrapQty: number;
  alreadyPosted?: boolean;
  correlationId?: string;
};

export async function postLoomInventoryMovements(
  params: LoomInventoryParams,
): Promise<ProductionInventoryResult> {
  const correlationId = params.correlationId ?? createProductionCorrelationId(params.productionRunId);

  const movements = [
    itemOutMovement(params.bobbinItemId, params.bobbinIssueQty, null, "Bobbin issued to loom"),
    params.outputRoll
      ? itemInMovement(
          params.outputRoll.inventoryItemId,
          params.rollOutputQty || params.outputRoll.weight || 0,
          params.outputRoll.batchLot,
          `Roll output ${params.outputRoll.rollNumber}`,
        )
      : itemInMovement(params.rollItemId, params.rollOutputQty, null, "Roll output"),
  ].filter(Boolean) as NonNullable<ReturnType<typeof itemOutMovement>>[];

  return postProductionInventoryMovements({
    tx: params.tx,
    userId: params.userId,
    referenceType: PRODUCTION_RUN_REFERENCE,
    referenceId: params.productionRunId,
    phase: "LOOM",
    correlationId,
    movements,
    skipIfAlreadyPosted: params.alreadyPosted,
  });
}
