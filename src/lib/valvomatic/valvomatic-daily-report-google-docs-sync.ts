import {
  ValvomaticReportItem,
  calculateValvomaticRow,
} from "./valvomatic-types";

export interface FocusedValvomaticReportCell {
  rowKey: string;
  field: keyof ValvomaticReportItem;
}

/**
 * Returns a stable unique identifier for a Valvomatic report entry row.
 * Precedence: database ID > roll number (case-insensitive) > sequence/index.
 */
export function getValvomaticReportRowKey(
  item: Partial<ValvomaticReportItem>,
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

export interface ReconcileValvomaticReportParams {
  localEntries: ValvomaticReportItem[];
  incomingEntries: ValvomaticReportItem[];
  focusedCell: FocusedValvomaticReportCell | null;
  hasUnsavedLocalEdits: boolean;
  deletedEntryIds?: Set<string>;
}

/**
 * 3-Way Google Docs-style reconciliation for Valvomatic Daily Report.
 * - Protects actively focused input cells from server overwrite.
 * - Retains pending local rows not yet committed to the backend.
 * - Suppresses rows present in deletedEntryIds.
 */
export function reconcileServerValvomaticReportEntries({
  localEntries,
  incomingEntries,
  focusedCell,
  hasUnsavedLocalEdits,
  deletedEntryIds,
}: ReconcileValvomaticReportParams): ValvomaticReportItem[] {
  // If no local unsaved edits, no active focus, and no pending deletes, server state is authoritative
  if (!hasUnsavedLocalEdits && !focusedCell && (!deletedEntryIds || deletedEntryIds.size === 0)) {
    return incomingEntries.map((e, idx) => calculateValvomaticRow({ ...e, sequence: idx + 1 }));
  }

  const localMap = new Map<string, ValvomaticReportItem>();
  localEntries.forEach((e, idx) => {
    localMap.set(getValvomaticReportRowKey(e, idx), e);
  });

  const merged: ValvomaticReportItem[] = [];
  const processedKeys = new Set<string>();

  // Process incoming server rows
  incomingEntries.forEach((serverEntry, sIdx) => {
    const key = getValvomaticReportRowKey(serverEntry, sIdx);

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
      merged.push(calculateValvomaticRow({ ...serverEntry, sequence: merged.length + 1 }));
      return;
    }

    processedKeys.add(key);

    // If this row has an actively focused cell, keep user's live keystrokes
    if (focusedCell && focusedCell.rowKey === key) {
      const activeField = focusedCell.field;
      const combined: ValvomaticReportItem = {
        ...serverEntry,
        [activeField]: localMatch[activeField],
      };
      merged.push(calculateValvomaticRow({ ...combined, sequence: merged.length + 1 }));
      return;
    }

    // If local row has uncommitted edits, preserve them
    if (hasUnsavedLocalEdits) {
      const combined: ValvomaticReportItem = {
        ...serverEntry,
        companyName: localMatch.companyName || serverEntry.companyName,
        unitName: localMatch.unitName || serverEntry.unitName,
        grade: localMatch.grade || serverEntry.grade,
        targetProductionPcs:
          localMatch.targetProductionPcs !== undefined && localMatch.targetProductionPcs !== 0
            ? localMatch.targetProductionPcs
            : serverEntry.targetProductionPcs,
        quality: localMatch.quality || serverEntry.quality,
        partyName: localMatch.partyName || serverEntry.partyName,
        rollNumber: localMatch.rollNumber || serverEntry.rollNumber,
        loomNumber: localMatch.loomNumber || serverEntry.loomNumber,
        rollMtr: localMatch.rollMtr || serverEntry.rollMtr,
        netWeight: localMatch.netWeight || serverEntry.netWeight,
        openingMeterReading:
          localMatch.openingMeterReading || serverEntry.openingMeterReading,
        closingMeterReading:
          localMatch.closingMeterReading || serverEntry.closingMeterReading,
        coverPatchOs: localMatch.coverPatchOs || serverEntry.coverPatchOs,
        coverPatchDs: localMatch.coverPatchDs || serverEntry.coverPatchDs,
        valvePatch: localMatch.valvePatch || serverEntry.valvePatch,
        productionPcs: localMatch.productionPcs || serverEntry.productionPcs,
        productionKg: localMatch.productionKg || serverEntry.productionKg,
        remarks: localMatch.remarks || serverEntry.remarks,
      };
      merged.push(calculateValvomaticRow({ ...combined, sequence: merged.length + 1 }));
      return;
    }

    merged.push(calculateValvomaticRow({ ...serverEntry, sequence: merged.length + 1 }));
  });

  // Preserve local rows not yet present on server (e.g. freshly added rows)
  localEntries.forEach((localEntry, lIdx) => {
    const key = getValvomaticReportRowKey(localEntry, lIdx);

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
      merged.push(calculateValvomaticRow({ ...localEntry, sequence: merged.length + 1 }));
    }
  });

  return merged;
}

/**
 * Creates a deterministic JSON payload string for auto-save diffing.
 */
export function serializeValvomaticReportPayload(
  header: {
    date: string;
    shiftName: string;
    machineNo?: string;
    operatorName?: string;
    supervisorName?: string;
    remarks?: string;
    status?: string;
  },
  entries: ValvomaticReportItem[]
): string {
  const normalizedEntries = entries.map((e) => ({
    companyName: e.companyName?.trim() || "",
    unitName: e.unitName?.trim() || "",
    grade: e.grade?.trim() || "",
    targetProductionPcs: Number(e.targetProductionPcs) || 0,
    quality: e.quality?.trim() || "",
    rollNumber: e.rollNumber?.trim().toUpperCase() || "",
    loomNumber: String(e.loomNumber || "").trim(),
    rollMtr: Number(e.rollMtr) || 0,
    netWeight: Number(e.netWeight) || 0,
    openingMeterReading: Number(e.openingMeterReading) || 0,
    closingMeterReading: Number(e.closingMeterReading) || 0,
    coverPatchOs: Number(e.coverPatchOs) || 0,
    coverPatchDs: Number(e.coverPatchDs) || 0,
    valvePatch: Number(e.valvePatch) || 0,
    productionPcs: Number(e.productionPcs) || 0,
    productionKg: Number(e.productionKg) || 0,
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
