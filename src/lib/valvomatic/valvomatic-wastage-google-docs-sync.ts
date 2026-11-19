import {
  ValvomaticWastageEntryItem,
  calculateValvomaticWastageRow,
} from "./valvomatic-types";

export interface FocusedValvomaticWastageCell {
  rowKey: string;
  field: keyof ValvomaticWastageEntryItem;
}

/**
 * Returns a stable unique identifier for a Valvomatic wastage entry row.
 * Precedence: database ID > roll number (case-insensitive) > sequence/index.
 */
export function getValvomaticWastageRowKey(
  item: Partial<ValvomaticWastageEntryItem>,
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

export interface ReconcileValvomaticWastageParams {
  localEntries: ValvomaticWastageEntryItem[];
  incomingEntries: ValvomaticWastageEntryItem[];
  focusedCell: FocusedValvomaticWastageCell | null;
  hasUnsavedLocalEdits: boolean;
  deletedEntryIds?: Set<string>;
}

/**
 * 3-Way Google Docs-style reconciliation for Valvomatic Wastage entries.
 * - Protects actively focused input cells from server overwrite.
 * - Retains pending local rows not yet committed to the backend.
 * - Suppresses rows present in deletedEntryIds.
 */
export function reconcileServerValvomaticWastageEntries({
  localEntries,
  incomingEntries,
  focusedCell,
  hasUnsavedLocalEdits,
  deletedEntryIds,
}: ReconcileValvomaticWastageParams): ValvomaticWastageEntryItem[] {
  // If no local unsaved edits, no active focus, and no pending deletes, server state is authoritative
  if (!hasUnsavedLocalEdits && !focusedCell && (!deletedEntryIds || deletedEntryIds.size === 0)) {
    return incomingEntries.map((e, idx) =>
      calculateValvomaticWastageRow({ ...e, sequence: idx + 1 })
    );
  }

  const localMap = new Map<string, ValvomaticWastageEntryItem>();
  localEntries.forEach((e, idx) => {
    localMap.set(getValvomaticWastageRowKey(e, idx), e);
  });

  const merged: ValvomaticWastageEntryItem[] = [];
  const processedKeys = new Set<string>();

  // Process incoming server rows
  incomingEntries.forEach((serverEntry, sIdx) => {
    const key = getValvomaticWastageRowKey(serverEntry, sIdx);

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
        calculateValvomaticWastageRow({ ...serverEntry, sequence: merged.length + 1 })
      );
      return;
    }

    processedKeys.add(key);

    // If this row has an actively focused cell, keep user's live keystrokes
    if (focusedCell && focusedCell.rowKey === key) {
      const activeField = focusedCell.field;
      const combined: ValvomaticWastageEntryItem = {
        ...serverEntry,
        [activeField]: localMatch[activeField],
      };
      merged.push(
        calculateValvomaticWastageRow({ ...combined, sequence: merged.length + 1 })
      );
      return;
    }

    // If local row has uncommitted edits, preserve user's local values
    if (hasUnsavedLocalEdits) {
      const combined: ValvomaticWastageEntryItem = {
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
        calculateValvomaticWastageRow({ ...combined, sequence: merged.length + 1 })
      );
      return;
    }

    merged.push(
      calculateValvomaticWastageRow({ ...serverEntry, sequence: merged.length + 1 })
    );
  });

  // Preserve local rows not yet present on server (e.g. freshly added rows)
  localEntries.forEach((localEntry, lIdx) => {
    const key = getValvomaticWastageRowKey(localEntry, lIdx);

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
        calculateValvomaticWastageRow({ ...localEntry, sequence: merged.length + 1 })
      );
    }
  });

  return merged;
}

/**
 * Creates a deterministic JSON payload string for auto-save diffing.
 */
export function serializeValvomaticWastagePayload(
  header: {
    date: string;
    shiftName: string;
    machineNo?: string;
    operatorName?: string;
    supervisorName?: string;
    remarks?: string;
    status?: string;
  },
  entries: ValvomaticWastageEntryItem[]
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
    machineNo: header.machineNo || "Valvomatic-1",
    operatorName: header.operatorName?.trim() || "",
    supervisorName: header.supervisorName?.trim() || "",
    remarks: header.remarks?.trim() || "",
    status: header.status || "DRAFT",
    entries: normalizedEntries,
  });
}
