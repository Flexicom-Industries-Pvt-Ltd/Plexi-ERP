import { Prisma } from "@/generated/prisma";
import {
  createProductionCorrelationId,
  itemInMovement,
  itemOutMovement,
  postProductionInventoryMovements,
  PRODUCTION_RUN_REFERENCE,
  resolveRollOutMovement,
  type ProductionInventoryMovement,
  type ProductionInventoryResult,
} from "@/lib/production/inventory-tx";
import type { ValvomaticInputs } from "@/lib/production/valvomatic-inputs";

async function bcsInputMovements(
  tx: Prisma.TransactionClient,
  inputs: ValvomaticInputs,
): Promise<ProductionInventoryMovement[]> {
  const movements: ProductionInventoryMovement[] = [];

  if (inputs.inputRollId && inputs.rollQty > 0) {
    const rollOut = await resolveRollOutMovement(tx, inputs.inputRollId, inputs.rollQty, "BCS roll");
    if (rollOut) movements.push(rollOut);
  }
  const yarnOut = itemOutMovement(inputs.yarnItemId, inputs.yarnQty, null, "Yarn consumed");
  const ppOut = itemOutMovement(inputs.ppItemId, inputs.ppQty, null, "PP consumed");
  const lppOut = itemOutMovement(inputs.lppItemId, inputs.lppQty, null, "LPP consumed");
  return [...movements, yarnOut, ppOut, lppOut].filter(Boolean) as ProductionInventoryMovement[];
}

type BcsInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  bcsRunId: string;
  productionRunId: string;
  inputs: ValvomaticInputs;
  teamMemberIds: string[];
  outputItemId?: string | null;
  outputBagQty: number;
  productionBatch?: string | null;
  scrapQty: number;
  alreadyPosted?: boolean;
  correlationId?: string;
};

export async function postBcsInventoryMovements(
  params: BcsInventoryParams,
): Promise<ProductionInventoryResult> {
  const correlationId = params.correlationId ?? createProductionCorrelationId(params.productionRunId);

  const movements = [
    ...(await bcsInputMovements(params.tx, params.inputs)),
    itemInMovement(params.outputItemId, params.outputBagQty, params.productionBatch, "Finished bags output"),
  ].filter(Boolean) as ProductionInventoryMovement[];

  return postProductionInventoryMovements({
    tx: params.tx,
    userId: params.userId,
    referenceType: PRODUCTION_RUN_REFERENCE,
    referenceId: params.productionRunId,
    phase: "BCS",
    correlationId,
    movements,
    skipIfAlreadyPosted: params.alreadyPosted,
  });
}
