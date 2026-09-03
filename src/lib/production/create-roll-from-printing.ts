import type { Prisma } from "@/generated/prisma";
import type { RollType } from "@/generated/prisma";
import { generateRollNumber } from "./roll-number";

type PrintingRunForRoll = {
  id: string;
  productionRunId: string;
  outputQty: number;
  brand: string | null;
  colour: string | null;
  artworkRef: string | null;
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

/** Create a printed ProductionRoll from a completed printing run (idempotent). */
export async function createProductionRollFromPrintingRun(
  tx: Prisma.TransactionClient,
  printingRun: PrintingRunForRoll,
) {
  if (printingRun.outputQty <= 0) {
    return null;
  }

  const existing = await tx.productionRoll.findUnique({
    where: { printingProductionRunId: printingRun.id },
  });
  if (existing) return existing;

  const mergedCharacteristics = {
    ...(typeof printingRun.inputRoll.characteristics === "object" &&
    printingRun.inputRoll.characteristics &&
    !Array.isArray(printingRun.inputRoll.characteristics)
      ? (printingRun.inputRoll.characteristics as Record<string, unknown>)
      : {}),
    ...(typeof printingRun.characteristics === "object" &&
    printingRun.characteristics &&
    !Array.isArray(printingRun.characteristics)
      ? (printingRun.characteristics as Record<string, unknown>)
      : {}),
    ...(printingRun.brand ? { brand: printingRun.brand } : {}),
    ...(printingRun.colour ? { colour: printingRun.colour } : {}),
    ...(printingRun.artworkRef ? { artworkRef: printingRun.artworkRef } : {}),
  };

  const weight =
    readCharacteristicNumber(printingRun.characteristics, "weight") ??
    printingRun.outputQty ??
    printingRun.inputRoll.weight;
  const length =
    readCharacteristicNumber(printingRun.characteristics, "length") ??
    printingRun.inputRoll.length;
  const batchLot =
    readCharacteristicString(printingRun.characteristics, "batchLot") ??
    readCharacteristicString(printingRun.characteristics, "batch") ??
    printingRun.inputRoll.batchLot;

  const rollNumber = await generateRollNumber(printingRun.inputRoll.rollType, tx);

  return tx.productionRoll.create({
    data: {
      rollNumber,
      rollType: printingRun.inputRoll.rollType,
      characteristics: mergedCharacteristics as Prisma.InputJsonValue,
      weight,
      length,
      batchLot,
      locationId: printingRun.inputRoll.locationId,
      inventoryItemId: printingRun.inputRoll.inventoryItemId,
      sourcePhase: "PRINTING",
      printingProductionRunId: printingRun.id,
      productionRunId: printingRun.productionRunId,
    },
  });
}
