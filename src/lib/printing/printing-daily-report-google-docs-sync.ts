import { PrintingReportItem, calculatePrintingRow } from "./printing-types";

export interface FocusedPrintingReportCell {
  rowKey: string;
  field: keyof PrintingReportItem;
}

export function getPrintingReportRowKey(
  entry: Partial<PrintingReportItem>,
  index: number
): string {
  if (entry.id && String(entry.id).trim().length > 0) {
    return `id:${entry.id}`;
  }
  if (entry.rollNumber && String(entry.rollNumber).trim().length > 0) {
    return `roll:${String(entry.rollNumber).trim().toUpperCase()}`;
  }
  return `seq:${entry.sequence ?? index + 1}`;
}

export interface ReconcilePrintingReportParams {
  localEntries: PrintingReportItem[];
  incomingEntries: PrintingReportItem[];
  focusedCell: FocusedPrintingReportCell | null;
  hasUnsavedLocalEdits: boolean;
  deletedEntryIds?: Set<string>;
}

/**
 * 3-Way Google Docs-style reconciliation for Printing Daily Production Report.
 * - Respects active cell focus: Never overwrites what the local user is currently editing.
 * - Reconciles server entries with local drafts without dropping locally added rows.
 * - Respects locally deleted row IDs so deleted rows don't get resurrected by in-flight server payloads.
 */
export function reconcileServerPrintingReportEntries({
  localEntries,
  incomingEntries,
  focusedCell,
  hasUnsavedLocalEdits,
  deletedEntryIds = new Set(),
}: ReconcilePrintingReportParams): PrintingReportItem[] {
  // If there are no local edits and no cell is focused, server is authoritative
  if (!hasUnsavedLocalEdits && !focusedCell) {
    return incomingEntries.filter((e, idx) => {
      const key = getPrintingReportRowKey(e, idx);
      const rawId = e.id || "";
      return !deletedEntryIds.has(key) && !deletedEntryIds.has(rawId);
    });
  }

  const localMap = new Map<string, { entry: PrintingReportItem; index: number }>();
  localEntries.forEach((entry, index) => {
    const key = getPrintingReportRowKey(entry, index);
    localMap.set(key, { entry, index });
  });

  const mergedEntries: PrintingReportItem[] = [];
  const processedLocalKeys = new Set<string>();

  // Process incoming server entries
  incomingEntries.forEach((serverEntry, serverIdx) => {
    const key = getPrintingReportRowKey(serverEntry, serverIdx);
    const rawId = serverEntry.id || "";

    if (deletedEntryIds.has(key) || deletedEntryIds.has(rawId)) {
      return;
    }

    const localMatch = localMap.get(key);

    if (!localMatch) {
      // New row from another user
      mergedEntries.push(serverEntry);
      return;
    }

    processedLocalKeys.add(key);
    const localEntry = localMatch.entry;

    // Check if user is actively typing in a cell on this row
    if (focusedCell && focusedCell.rowKey === key) {
      const field = focusedCell.field;
      const merged: PrintingReportItem = {
        ...serverEntry,
        [field]: localEntry[field],
      };
      mergedEntries.push(calculatePrintingRow(merged));
      return;
    }

    // If local has uncommitted edits on this row, prioritize local values for non-empty fields
    if (hasUnsavedLocalEdits) {
      const merged: PrintingReportItem = {
        ...serverEntry,
        companyName: localEntry.companyName || serverEntry.companyName,
        unitName: localEntry.unitName || serverEntry.unitName,
        grade: localEntry.grade || serverEntry.grade,
        targetProductionMtrs: localEntry.targetProductionMtrs || serverEntry.targetProductionMtrs,
        drumSize: localEntry.drumSize || serverEntry.drumSize,
        quality: localEntry.quality || serverEntry.quality,
        rollNumber: localEntry.rollNumber || serverEntry.rollNumber,
        loomNumber: localEntry.loomNumber || serverEntry.loomNumber,
        productionMeter: localEntry.productionMeter || serverEntry.productionMeter,
        netWeight: localEntry.netWeight || serverEntry.netWeight,
        printMeter: localEntry.printMeter || serverEntry.printMeter,
        remarks: localEntry.remarks || serverEntry.remarks,
      };
      mergedEntries.push(calculatePrintingRow(merged));
      return;
    }

    // Default: accept latest server row
    mergedEntries.push(serverEntry);
  });

  // Preserve any local rows not yet known to the server
  localEntries.forEach((localEntry, idx) => {
    const key = getPrintingReportRowKey(localEntry, idx);
    const rawId = localEntry.id || "";

    if (deletedEntryIds.has(key) || deletedEntryIds.has(rawId)) {
      return;
    }

    if (!processedLocalKeys.has(key)) {
      const hasContent = Boolean(
        localEntry.companyName ||
        localEntry.rollNumber ||
        localEntry.quality ||
        Number(localEntry.productionMeter) > 0 ||
        Number(localEntry.netWeight) > 0 ||
        Number(localEntry.printMeter) > 0
      );
      if (hasContent || (focusedCell && focusedCell.rowKey === key)) {
        mergedEntries.push(localEntry);
      }
    }
  });

  // Re-sequence 1-based
  return mergedEntries.map((e, idx) => ({
    ...e,
    sequence: idx + 1,
  }));
}

/**
 * Creates canonical deterministic serialization of report payload to detect echoes.
 */
export function serializePrintingReportPayload(
  header: {
    date: string;
    shiftName: string;
    machineNo?: string;
    operatorName?: string | null;
    supervisorName?: string | null;
    status: string;
    remarks?: string | null;
  },
  entries: PrintingReportItem[]
): string {
  const normHeader = {
    date: header.date,
    shiftName: header.shiftName,
    machineNo: header.machineNo || "Machine-1",
    operatorName: header.operatorName?.trim() || "",
    supervisorName: header.supervisorName?.trim() || "",
    status: header.status,
    remarks: header.remarks?.trim() || "",
  };

  const normEntries = entries.map((e, idx) => ({
    id: e.id || "",
    seq: idx + 1,
    comp: (e.companyName || "").trim(),
    unit: (e.unitName || "").trim(),
    grd: (e.grade || "").trim(),
    tgt: Number(e.targetProductionMtrs) || 0,
    drum: (e.drumSize || "").trim(),
    qlt: (e.quality || "").trim(),
    roll: (e.rollNumber || "").trim().toUpperCase(),
    loom: String(e.loomNumber || "").trim(),
    prodMtr: Number(e.productionMeter) || 0,
    netWt: Number(e.netWeight) || 0,
    printMtr: Number(e.printMeter) || 0,
    rem: (e.remarks || "").trim(),
  }));

  return JSON.stringify({ h: normHeader, e: normEntries });
}
