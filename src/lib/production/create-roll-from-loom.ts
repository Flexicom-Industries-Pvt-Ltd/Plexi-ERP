import type { Prisma } from "@/generated/prisma";
import type { RollType } from "@/generated/prisma";
import { generateRollNumber } from "./roll-number";

type LoomRunForRoll = {
  id: string;
  productionRunId: string;
  rollType: RollType | null;
  rollOutputQty: number;
  rollItemId: string | null;
  characteristics: Prisma.JsonValue;
};

function readCharacteristicNumber(
  characteristics: Prisma.JsonValue,
  key: string,
): number | null {
  if (!characteristics || typeof characteristics !== "object" || Array.isArray(characteristics)) {
    return null;
  }
  const value = (characteristics as Record<string, unknown>)[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function readCharacteristicString(
  characteristics: Prisma.JsonValue,
  key: string,
): string | null {
  if (!characteristics || typeof characteristics !== "object" || Array.isArray(characteristics)) {
    return null;
  }
  const value = (characteristics as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

/** Create a ProductionRoll record from a completed loom run (idempotent). */
export async function createProductionRollFromLoomRun(
  tx: Prisma.TransactionClient,
  loomRun: LoomRunForRoll,
) {
  if (!loomRun.rollType || loomRun.rollOutputQty <= 0) {
    return null;
  }

  const existing = await tx.productionRoll.findUnique({
    where: { loomProductionRunId: loomRun.id },
  });
  if (existing) return existing;

  const rollItem = loomRun.rollItemId
    ? await tx.inventoryItem.findUnique({
        where: { id: loomRun.rollItemId },
        select: { id: true, locationId: true },
      })
    : null;

  const weight =
    readCharacteristicNumber(loomRun.characteristics, "weight") ?? loomRun.rollOutputQty;
  const length = readCharacteristicNumber(loomRun.characteristics, "length");
  const batchLot =
    readCharacteristicString(loomRun.characteristics, "batchLot") ??
    readCharacteristicString(loomRun.characteristics, "batch");

  const rollNumber = await generateRollNumber(loomRun.rollType, tx);

  return tx.productionRoll.create({
    data: {
      rollNumber,
      rollType: loomRun.rollType,
      characteristics: loomRun.characteristics ?? undefined,
      weight,
      length,
      batchLot,
      locationId: rollItem?.locationId ?? null,
      inventoryItemId: rollItem?.id ?? null,
      sourcePhase: "LOOM",
      loomProductionRunId: loomRun.id,
      productionRunId: loomRun.productionRunId,
    },
  });
}
