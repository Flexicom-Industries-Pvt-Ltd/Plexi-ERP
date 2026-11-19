import {
  PrintingRawMaterialEntryItem,
  calculatePrintingRawMaterialRow,
  computePrintingRawMaterialTotals,
} from "./printing-types";

export interface FocusedPrintingRawMaterialCell {
  rowKey: string;
  field: keyof PrintingRawMaterialEntryItem;
}

export function getPrintingRawMaterialRowKey(
  entry: Partial<PrintingRawMaterialEntryItem>,
  index: number
): string {
  if (entry.id && String(entry.id).trim().length > 0) {
    return `id:${entry.id}`;
  }
  if (entry.rawMaterialId && String(entry.rawMaterialId).trim().length > 0) {
    return `rm:${entry.rawMaterialId}`;
  }
  if (entry.materialName && String(entry.materialName).trim().length > 0) {
    return `name:${String(entry.materialName).trim().toUpperCase()}`;
  }
  return `seq:${entry.sequence ?? index + 1}`;
}

export interface ReconcilePrintingRawMaterialParams {
  localEntries: PrintingRawMaterialEntryItem[];
  incomingEntries: PrintingRawMaterialEntryItem[];
  focusedCell: FocusedPrintingRawMaterialCell | null;
  hasUnsavedLocalEdits: boolean;
  totalPrintMtrs?: number;
  deletedEntryIds?: Set<string>;
}

/**
 * 3-Way Google Docs-style reconciliation for Printing Raw Material sheet.
 * - Typing isolation on consumedLitre, consumedKg, conversionFactor, etc.
 * - Auto-recalculates ratios and mileages dynamically on incoming server updates.
 */
export function reconcileServerPrintingRawMaterialEntries({
  localEntries,
  incomingEntries,
  focusedCell,
  hasUnsavedLocalEdits,
  totalPrintMtrs = 0,
  deletedEntryIds,
}: ReconcilePrintingRawMaterialParams): PrintingRawMaterialEntryItem[] {
  if (!hasUnsavedLocalEdits && !focusedCell && (!deletedEntryIds || deletedEntryIds.size === 0)) {
    const { calculatedEntries } = computePrintingRawMaterialTotals(
      incomingEntries,
      totalPrintMtrs
    );
    return calculatedEntries;
  }

  const localMap = new Map<string, PrintingRawMaterialEntryItem>();
  localEntries.forEach((e, idx) => {
    localMap.set(getPrintingRawMaterialRowKey(e, idx), e);
  });

  const mergedRaw: PrintingRawMaterialEntryItem[] = [];
  const processedKeys = new Set<string>();

  incomingEntries.forEach((serverEntry, sIdx) => {
    const key = getPrintingRawMaterialRowKey(serverEntry, sIdx);

    if (
      deletedEntryIds &&
      ((serverEntry.id && deletedEntryIds.has(serverEntry.id)) ||
        (serverEntry.rawMaterialId && deletedEntryIds.has(serverEntry.rawMaterialId)) ||
        (serverEntry.materialName &&
          deletedEntryIds.has(serverEntry.materialName.trim().toUpperCase())) ||
        deletedEntryIds.has(key))
    ) {
      return;
    }

    const localMatch = localMap.get(key);

    if (!localMatch) {
      mergedRaw.push(serverEntry);
      return;
    }

    processedKeys.add(key);

    if (focusedCell && focusedCell.rowKey === key) {
      const field = focusedCell.field;
      const merged = {
        ...serverEntry,
        [field]: localMatch[field],
      };
      mergedRaw.push(calculatePrintingRawMaterialRow(merged, totalPrintMtrs));
      return;
    }

    if (hasUnsavedLocalEdits) {
      const merged = {
        ...serverEntry,
        consumedLitre:
          localMatch.consumedLitre !== "" && localMatch.consumedLitre !== undefined
            ? localMatch.consumedLitre
            : serverEntry.consumedLitre,
        consumedKg:
          localMatch.consumedKg !== "" && localMatch.consumedKg !== undefined
            ? localMatch.consumedKg
            : serverEntry.consumedKg,
        conversionFactor: localMatch.conversionFactor || serverEntry.conversionFactor,
        remarks: localMatch.remarks || serverEntry.remarks,
      };
      mergedRaw.push(calculatePrintingRawMaterialRow(merged, totalPrintMtrs));
      return;
    }

    mergedRaw.push(serverEntry);
  });

  // Keep any locally created materials not yet in server list
  localEntries.forEach((localEntry, lIdx) => {
    const key = getPrintingRawMaterialRowKey(localEntry, lIdx);

    if (
      deletedEntryIds &&
      ((localEntry.id && deletedEntryIds.has(localEntry.id)) ||
        (localEntry.rawMaterialId && deletedEntryIds.has(localEntry.rawMaterialId)) ||
        (localEntry.materialName &&
          deletedEntryIds.has(localEntry.materialName.trim().toUpperCase())) ||
        deletedEntryIds.has(key))
    ) {
      return;
    }

    if (!processedKeys.has(key)) {
      mergedRaw.push(localEntry);
    }
  });

  const { calculatedEntries } = computePrintingRawMaterialTotals(
    mergedRaw,
    totalPrintMtrs
  );
  return calculatedEntries;
}

/**
 * Serializes raw material payload for echo suppression.
 */
export function serializePrintingRawMaterialPayload(
  header: {
    date: string;
    shiftName: string;
    operatorName?: string | null;
    supervisorName?: string | null;
    totalPrintMtrs: number;
    status: string;
    remarks?: string | null;
  },
  entries: PrintingRawMaterialEntryItem[]
): string {
  const normHeader = {
    date: header.date,
    shiftName: header.shiftName,
    operatorName: header.operatorName?.trim() || "",
    supervisorName: header.supervisorName?.trim() || "",
    totalPrintMtrs: Number(header.totalPrintMtrs) || 0,
    status: header.status,
    remarks: header.remarks?.trim() || "",
  };

  const normEntries = entries.map((e, idx) => ({
    id: e.id || "",
    seq: idx + 1,
    matId: e.rawMaterialId || "",
    name: (e.materialName || "").trim().toUpperCase(),
    unit: (e.unit || "LITRE").toUpperCase(),
    lit: Number(e.consumedLitre) || 0,
    fac: Number(e.conversionFactor) || 0.82,
    kg: Number(e.consumedKg) || 0,
    rem: (e.remarks || "").trim(),
  }));

  return JSON.stringify({ h: normHeader, e: normEntries });
}
