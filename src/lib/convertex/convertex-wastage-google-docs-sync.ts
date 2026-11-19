import {
  ConvertexWastageEntryItem,
  calculateConvertexWastageRow,
} from "./convertex-types";

export interface FocusedConvertexWastageCell {
  rowKey: string;
  field: keyof ConvertexWastageEntryItem;
}

/**
 * Returns a stable unique identifier for a Convertex wastage entry row.
 * Precedence: database ID > roll number (case-insensitive) > sequence/index.
 */
export function getConvertexWastageRowKey(
  item: Partial<ConvertexWastageEntryItem>,
  index: number
): string {
  if (item.id && String(item.id).trim().length > 0) {
    return `id:${item.id}`;
  }
  if (item.rollNumber && String(item.rollNumber).trim().length > 0) {
    return `roll:${String(item.rollNumber).trim().toUpperCase()}`;
  }
  return `seq:${item.sequence ?? index + 1}`;
}

export interface ReconcileConvertexWastageParams {
  localEntries: ConvertexWastageEntryItem[];
  incomingEntries: ConvertexWastageEntryItem[];
  focusedCell: FocusedConvertexWastageCell | null;
  hasUnsavedLocalEdits: boolean;
  deletedEntryIds?: Set<string>;
}

/**
 * 3-Way Google Docs-style reconciliation for Convertex Wastage entries.
 * - Protects actively focused input cells from server overwrite.
 * - Retains pending local rows not yet committed to the backend.
 * - Suppresses rows present in deletedEntryIds.
 */
export function reconcileServerConvertexWastageEntries({
  localEntries,
  incomingEntries,
  focusedCell,
  hasUnsavedLocalEdits,
  deletedEntryIds,
}: ReconcileConvertexWastageParams): ConvertexWastageEntryItem[] {
  // If no local unsaved edits, no active focus, and no pending deletes, server state is authoritative
  if (!hasUnsavedLocalEdits && !focusedCell && (!deletedEntryIds || deletedEntryIds.size === 0)) {
    return incomingEntries.map((e, idx) =>
      calculateConvertexWastageRow({ ...e, sequence: idx + 1 })
    );
  }

  const localMap = new Map<string, ConvertexWastageEntryItem>();
  localEntries.forEach((e, idx) => {
    localMap.set(getConvertexWastageRowKey(e, idx), e);
  });

  const merged: ConvertexWastageEntryItem[] = [];
  const processedKeys = new Set<string>();

  // Process incoming server rows
  incomingEntries.forEach((serverEntry, sIdx) => {
    const key = getConvertexWastageRowKey(serverEntry, sIdx);

    // Skip if row was deleted locally
    if (
      deletedEntryIds &&
      ((serverEntry.id && deletedEntryIds.has(serverEntry.id)) ||
        (serverEntry.rollNumber &&
          deletedEntryIds.has(serverEntry.rollNumber.trim().toUpperCase())) ||
        deletedEntryIds.has(key))
    ) {
      return;
    }

    const localMatch = localMap.get(key);

    if (!localMatch) {
      merged.push(
        calculateConvertexWastageRow({ ...serverEntry, sequence: merged.length + 1 })
      );
      return;
    }

    processedKeys.add(key);

    // If this row has an actively focused cell, keep user's live keystrokes
    if (focusedCell && focusedCell.rowKey === key) {
      const activeField = focusedCell.field;
      const combined: ConvertexWastageEntryItem = {
        ...serverEntry,
        [activeField]: localMatch[activeField],
      };
      merged.push(
        calculateConvertexWastageRow({ ...combined, sequence: merged.length + 1 })
      );
      return;
    }

    // If local row has uncommitted edits, preserve user's local values
    if (hasUnsavedLocalEdits) {
      const combined: ConvertexWastageEntryItem = {
        ...serverEntry,
        quality: localMatch.quality || serverEntry.quality,
        rollNumber: localMatch.rollNumber || serverEntry.rollNumber,
        productionKg:
          localMatch.productionKg !== undefined && localMatch.productionKg !== 0
            ? localMatch.productionKg
            : serverEntry.productionKg,
        loomWasteKg:
          localMatch.loomWasteKg !== undefined && localMatch.loomWasteKg !== 0
            ? localMatch.loomWasteKg
            : serverEntry.loomWasteKg,
        lamWasteKg:
          localMatch.lamWasteKg !== undefined && localMatch.lamWasteKg !== 0
            ? localMatch.lamWasteKg
            : serverEntry.lamWasteKg,
        printWasteKg:
          localMatch.printWasteKg !== undefined && localMatch.printWasteKg !== 0
            ? localMatch.printWasteKg
            : serverEntry.printWasteKg,
        machineWasteKg:
          localMatch.machineWasteKg !== undefined && localMatch.machineWasteKg !== 0
            ? localMatch.machineWasteKg
            : serverEntry.machineWasteKg,
        coverPatchWasteKg:
          localMatch.coverPatchWasteKg !== undefined && localMatch.coverPatchWasteKg !== 0
            ? localMatch.coverPatchWasteKg
            : serverEntry.coverPatchWasteKg,
        remarks: localMatch.remarks || serverEntry.remarks,
      };
      merged.push(
        calculateConvertexWastageRow({ ...combined, sequence: merged.length + 1 })
      );
      return;
    }

    merged.push(
      calculateConvertexWastageRow({ ...serverEntry, sequence: merged.length + 1 })
    );
  });

  // Preserve local rows not yet present on server (e.g. freshly added rows)
  localEntries.forEach((localEntry, lIdx) => {
    const key = getConvertexWastageRowKey(localEntry, lIdx);

    if (
      deletedEntryIds &&
      ((localEntry.id && deletedEntryIds.has(localEntry.id)) ||
        (localEntry.rollNumber &&
          deletedEntryIds.has(localEntry.rollNumber.trim().toUpperCase())) ||
        deletedEntryIds.has(key))
    ) {
      return;
    }

    if (!processedKeys.has(key)) {
      merged.push(
        calculateConvertexWastageRow({ ...localEntry, sequence: merged.length + 1 })
      );
    }
  });

  return merged;
}

/**
 * Creates a deterministic JSON payload string for auto-save diffing.
 */
export function serializeConvertexWastagePayload(
  header: {
    date: string;
    shiftName: string;
    machineNo?: string;
    operatorName?: string;
    supervisorName?: string;
    remarks?: string;
    status?: string;
  },
  entries: ConvertexWastageEntryItem[]
): string {
  const normalizedEntries = entries.map((e) => ({
    quality: e.quality?.trim() || "",
    rollNumber: e.rollNumber?.trim().toUpperCase() || "",
    productionKg: Number(e.productionKg) || 0,
    loomWasteKg: Number(e.loomWasteKg) || 0,
    lamWasteKg: Number(e.lamWasteKg) || 0,
    printWasteKg: Number(e.printWasteKg) || 0,
    machineWasteKg: Number(e.machineWasteKg) || 0,
    coverPatchWasteKg: Number(e.coverPatchWasteKg) || 0,
    remarks: e.remarks?.trim() || "",
  }));

  return JSON.stringify({
    date: header.date,
    shiftName: header.shiftName,
    machineNo: header.machineNo || "Convertex-1",
    operatorName: header.operatorName?.trim() || "",
    supervisorName: header.supervisorName?.trim() || "",
    remarks: header.remarks?.trim() || "",
    status: header.status || "DRAFT",
    entries: normalizedEntries,
  });
}
