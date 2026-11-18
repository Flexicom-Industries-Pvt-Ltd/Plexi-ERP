/**
 * Google Docs-Style Realtime Concurrent Synchronization Engine for Lamination Raw Material Sheet
 *
 * Provides:
 * 1. Active Focused Cell Typing Isolation - isolates active machineKg, percentage, or remarks inputs from remote overwrite.
 * 2. Deterministic 3-Way Reconciliation - merges remote percentage or master updates without wiping operator input.
 * 3. Stable serialization and non-destructive row-level matching by ID, rawMaterialId, or materialName.
 */

import {
  RawMaterialEntryItem,
  LaminationRawMaterialReportData,
  calculateRawMaterialRow,
} from "./lamination-raw-material-types";

export interface FocusedRawMaterialCell {
  rowKey: string;
  field: keyof RawMaterialEntryItem;
}

export function getRawMaterialRowKey(entry: Partial<RawMaterialEntryItem>, fallbackIdx?: number): string {
  if (entry.id) return entry.id;
  if (entry.rawMaterialId) return `rm-${entry.rawMaterialId}`;
  if (entry.materialName && entry.materialName.trim()) {
    return `name-${entry.materialName.trim().toLowerCase()}`;
  }
  if (entry.sequence !== undefined) return `seq-${entry.sequence}`;
  return `idx-${fallbackIdx ?? 0}`;
}

export function serializeRawMaterialPayload(
  header: Partial<LaminationRawMaterialReportData>,
  entries: RawMaterialEntryItem[]
): string {
  return JSON.stringify({
    date: header.date || "",
    shiftName: header.shiftName || "",
    operatorName: (header.operatorName || "").trim(),
    supervisorName: (header.supervisorName || "").trim(),
    status: header.status || "DRAFT",
    remarks: (header.remarks || "").trim(),
    manualTotalKg: Number(header.manualTotalKg) || 0,
    entries: entries.map((e, idx) => ({
      id: e.id || undefined,
      rawMaterialId: e.rawMaterialId || null,
      materialName: (e.materialName || "").trim(),
      percentage: Number(e.percentage) || 0,
      machineKg: Number(e.machineKg) || 0,
      sequence: e.sequence || idx + 1,
      remarks: (e.remarks || "").trim(),
    })),
  });
}

export interface ReconcileRawMaterialOptions {
  localEntries: RawMaterialEntryItem[];
  incomingEntries: RawMaterialEntryItem[];
  focusedCell?: FocusedRawMaterialCell | null;
  hasUnsavedLocalEdits?: boolean;
  manualTotalKg?: number;
}

export function reconcileServerRawMaterialEntries({
  localEntries,
  incomingEntries,
  focusedCell,
  hasUnsavedLocalEdits = false,
  manualTotalKg = 0,
}: ReconcileRawMaterialOptions): RawMaterialEntryItem[] {
  // If no unsaved edits and no cell is being actively focused, adopt incoming
  if (!hasUnsavedLocalEdits && !focusedCell) {
    return incomingEntries.map((e, idx) => {
      const { manualKg, diffKg } = calculateRawMaterialRow(
        manualTotalKg,
        e.machineKg,
        e.percentage
      );
      return {
        ...e,
        manualKg,
        diffKg,
        sequence: e.sequence || idx + 1,
      };
    });
  }

  const incomingByKey = new Map<string, RawMaterialEntryItem>();
  for (let i = 0; i < incomingEntries.length; i++) {
    const item = incomingEntries[i];
    const key = getRawMaterialRowKey(item, i);
    incomingByKey.set(key, item);
    if (item.id) incomingByKey.set(item.id, item);
    if (item.rawMaterialId) incomingByKey.set(`rm-${item.rawMaterialId}`, item);
    if (item.materialName && item.materialName.trim()) {
      incomingByKey.set(`name-${item.materialName.trim().toLowerCase()}`, item);
    }
  }

  const merged: RawMaterialEntryItem[] = [];
  const processedKeys = new Set<string>();

  for (let i = 0; i < localEntries.length; i++) {
    const local = localEntries[i];
    const rowKey = getRawMaterialRowKey(local, i);

    const matchedIncoming =
      incomingByKey.get(rowKey) ||
      (local.id ? incomingByKey.get(local.id) : undefined) ||
      (local.rawMaterialId ? incomingByKey.get(`rm-${local.rawMaterialId}`) : undefined) ||
      (local.materialName && local.materialName.trim()
        ? incomingByKey.get(`name-${local.materialName.trim().toLowerCase()}`)
        : undefined);

    if (matchedIncoming) {
      const incomingKey = getRawMaterialRowKey(matchedIncoming, i);
      processedKeys.add(incomingKey);
      if (matchedIncoming.id) processedKeys.add(matchedIncoming.id);
      if (matchedIncoming.rawMaterialId) processedKeys.add(`rm-${matchedIncoming.rawMaterialId}`);
      if (matchedIncoming.materialName) processedKeys.add(`name-${matchedIncoming.materialName.trim().toLowerCase()}`);

      const isCurrentRowFocused =
        focusedCell &&
        (focusedCell.rowKey === rowKey ||
          (local.id && focusedCell.rowKey === local.id) ||
          (local.rawMaterialId && focusedCell.rowKey === local.rawMaterialId) ||
          (local.materialName && focusedCell.rowKey === local.materialName));

      if (isCurrentRowFocused) {
        // Typing isolation: adopt remote updates for other fields, but keep local focused cell value exactly as typed
        const isolatedField = focusedCell.field;
        const mergedItem: RawMaterialEntryItem = {
          ...local,
          ...matchedIncoming,
          id: matchedIncoming.id || local.id,
          [isolatedField]: local[isolatedField],
        };
        const { manualKg, diffKg } = calculateRawMaterialRow(
          manualTotalKg,
          mergedItem.machineKg,
          mergedItem.percentage
        );
        merged.push({ ...mergedItem, manualKg, diffKg, sequence: merged.length + 1 });
      } else if (hasUnsavedLocalEdits) {
        // Local modified fields take precedence
        const mergedItem: RawMaterialEntryItem = {
          ...matchedIncoming,
          ...local,
          id: matchedIncoming.id || local.id,
        };
        const { manualKg, diffKg } = calculateRawMaterialRow(
          manualTotalKg,
          mergedItem.machineKg,
          mergedItem.percentage
        );
        merged.push({ ...mergedItem, manualKg, diffKg, sequence: merged.length + 1 });
      } else {
        // Adopt incoming authoritative entry
        const { manualKg, diffKg } = calculateRawMaterialRow(
          manualTotalKg,
          matchedIncoming.machineKg,
          matchedIncoming.percentage
        );
        merged.push({ ...matchedIncoming, manualKg, diffKg, sequence: merged.length + 1 });
      }
    } else {
      // Local entry not in incoming
      const { manualKg, diffKg } = calculateRawMaterialRow(
        manualTotalKg,
        local.machineKg,
        local.percentage
      );
      merged.push({ ...local, manualKg, diffKg, sequence: merged.length + 1 });
    }
  }

  // Include any new remote entries
  for (let i = 0; i < incomingEntries.length; i++) {
    const inc = incomingEntries[i];
    const incKey = getRawMaterialRowKey(inc, i);
    const incId = inc.id;
    const rmKey = inc.rawMaterialId ? `rm-${inc.rawMaterialId}` : null;
    const nameKey = inc.materialName && inc.materialName.trim() ? `name-${inc.materialName.trim().toLowerCase()}` : null;

    const alreadyProcessed =
      processedKeys.has(incKey) ||
      (incId ? processedKeys.has(incId) : false) ||
      (rmKey ? processedKeys.has(rmKey) : false) ||
      (nameKey ? processedKeys.has(nameKey) : false);

    if (!alreadyProcessed) {
      const { manualKg, diffKg } = calculateRawMaterialRow(
        manualTotalKg,
        inc.machineKg,
        inc.percentage
      );
      merged.push({ ...inc, manualKg, diffKg, sequence: merged.length + 1 });
    }
  }

  return merged;
}
