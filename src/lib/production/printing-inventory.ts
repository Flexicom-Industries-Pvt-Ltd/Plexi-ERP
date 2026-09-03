import { Prisma } from "@/generated/prisma";
import {
  createProductionCorrelationId,
  itemOutMovement,
  postProductionInventoryMovements,
  PRODUCTION_RUN_REFERENCE,
  resolveRollOutMovement,
  rollInMovement,
  type ProductionInventoryMovement,
  type ProductionInventoryResult,
} from "@/lib/production/inventory-tx";

type InkMaterial = {
  itemId?: string;
  name: string;
  qty: number;
};

type PrintingInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  printingRunId: string;
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
  inkMaterials: unknown;
  scrapQty: number;
  alreadyPosted?: boolean;
  correlationId?: string;
};

function inkMovements(inkMaterials: unknown): ProductionInventoryMovement[] {
  if (!Array.isArray(inkMaterials)) return [];
  return inkMaterials
    .map((raw) => {
      const ink = raw as InkMaterial;
      return itemOutMovement(ink.itemId, ink.qty, null, `Ink/reducer: ${ink.name}`);
    })
    .filter(Boolean) as ProductionInventoryMovement[];
}

export async function postPrintingInventoryMovements(
  params: PrintingInventoryParams,
): Promise<ProductionInventoryResult> {
  const correlationId = params.correlationId ?? createProductionCorrelationId(params.productionRunId);

  const rollOut = await resolveRollOutMovement(params.tx, params.inputRollId, params.inputQty);
  const rollIn = params.outputRoll
    ? rollInMovement(params.outputRoll, params.outputQty || params.outputRoll.weight || 0)
    : null;

  const movements = [rollOut, rollIn, ...inkMovements(params.inkMaterials)].filter(
    Boolean,
  ) as ProductionInventoryMovement[];

  return postProductionInventoryMovements({
    tx: params.tx,
    userId: params.userId,
    referenceType: PRODUCTION_RUN_REFERENCE,
    referenceId: params.productionRunId,
    phase: "PRINTING",
    correlationId,
    movements,
    skipIfAlreadyPosted: params.alreadyPosted,
  });
}
