import type { Prisma } from "@/generated/prisma";
import type { RollType } from "@/generated/prisma";
import { generateRollNumber } from "./roll-number";

type LaminationRunForRoll = {
  id: string;
  productionRunId: string;
  outputQty: number;
  characteristics: Prisma.JsonValue;
  inputRoll: {
    rollType: RollType;
    weight: number | null;
    length: number | null;
    batchLot: string | null;
    locationId: string | null;
    inventoryItemId: string | null;
    characteristics: Prisma.JsonValue;
  };
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

/** Create a laminated ProductionRoll from a completed lamination run (idempotent). */
export async function createProductionRollFromLaminationRun(
  tx: Prisma.TransactionClient,
  laminationRun: LaminationRunForRoll,
) {
  if (laminationRun.outputQty <= 0) {
    return null;
  }

  const existing = await tx.productionRoll.findUnique({
    where: { laminationProductionRunId: laminationRun.id },
  });
  if (existing) return existing;

  const mergedCharacteristics = {
    ...(typeof laminationRun.inputRoll.characteristics === "object" &&
    laminationRun.inputRoll.characteristics &&
    !Array.isArray(laminationRun.inputRoll.characteristics)
      ? (laminationRun.inputRoll.characteristics as Record<string, unknown>)
      : {}),
    ...(typeof laminationRun.characteristics === "object" &&
    laminationRun.characteristics &&
    !Array.isArray(laminationRun.characteristics)
      ? (laminationRun.characteristics as Record<string, unknown>)
      : {}),
  };

  const weight =
    readCharacteristicNumber(laminationRun.characteristics, "weight") ??
    laminationRun.outputQty ??
    laminationRun.inputRoll.weight;
  const length =
    readCharacteristicNumber(laminationRun.characteristics, "length") ??
    laminationRun.inputRoll.length;
  const batchLot =
    readCharacteristicString(laminationRun.characteristics, "batchLot") ??
    readCharacteristicString(laminationRun.characteristics, "batch") ??
    laminationRun.inputRoll.batchLot;

  const rollNumber = await generateRollNumber(laminationRun.inputRoll.rollType, tx);

  const outputRoll = await tx.productionRoll.create({
    data: {
      rollNumber,
      rollType: laminationRun.inputRoll.rollType,
      characteristics: mergedCharacteristics as Prisma.InputJsonValue,
      weight,
      length,
      batchLot,
      locationId: laminationRun.inputRoll.locationId,
      inventoryItemId: laminationRun.inputRoll.inventoryItemId,
      sourcePhase: "LAMINATION",
      laminationProductionRunId: laminationRun.id,
      productionRunId: laminationRun.productionRunId,
    },
  });

  return outputRoll;
}
