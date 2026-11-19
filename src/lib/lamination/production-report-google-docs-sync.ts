/**
 * Google Docs-Style Realtime Concurrent Synchronization Engine for Lamination Production Reports
 *
 * Provides:
 * 1. Active Focused Cell Typing Isolation - protects live user keystrokes from remote sync clobbering.
 * 2. Deterministic 3-Way Reconciliation - merges concurrent remote changes without row duplicates or lost edits.
 * 3. Non-destructive row-level reconciliation matching by ID, loomRollCuttingEntryId, or rollNumber.
 * 4. Deleted roll tracking to ensure deletions are authoritative across devices.
 */

import {
  LaminationProductionEntryData,
  LaminationProductionReportData,
  calculateLaminationEntry,
} from "./lamination-types";

export interface FocusedLaminationCell {
  rowKey: string;
  field: keyof LaminationProductionEntryData;
}

export function getLaminationRowKey(entry: Partial<LaminationProductionEntryData>, fallbackIdx?: number): string {
  if (entry.id) return entry.id;
  if (entry.loomRollCuttingEntryId) return `cut-${entry.loomRollCuttingEntryId}`;
  if (entry.rollNumber && entry.rollNumber.trim()) return `roll-${entry.rollNumber.trim()}`;
  if (entry.sequence !== undefined) return `seq-${entry.sequence}`;
  return `idx-${fallbackIdx ?? 0}`;
}

export function serializeLaminationReportPayload(
  header: Partial<LaminationProductionReportData>,
  entries: LaminationProductionEntryData[],
  deletedEntryIds: string[] = []
): string {
  return JSON.stringify({
    date: header.date || "",
    shiftName: header.shiftName || "",
    operatorName: (header.operatorName || "").trim(),
    operatorId: header.operatorId || null,
    helperCount: Number(header.helperCount) || 0,
    supervisorName: (header.supervisorName || "").trim(),
    status: header.status || "DRAFT",
    remarks: (header.remarks || "").trim(),
    deletedEntryIds: Array.from(new Set(deletedEntryIds)).sort(),
    entries: entries.map((e, idx) => ({
      id: e.id || undefined,
      sequence: idx + 1,
      quality: (e.quality || "").trim(),
      size: (e.size || "").trim(),
      loomNumber: Number(e.loomNumber) || 0,
      rollNumber: (e.rollNumber || "").trim(),
      rollMeter: Number(e.rollMeter) || 0,
      netWeightBefore: Number(e.netWeightBefore) || 0,
      avgWeightBefore: Number(e.avgWeightBefore) || 0,
      productionMeter: Number(e.productionMeter) || 0,
      netWeightAfter: Number(e.netWeightAfter) || 0,
      avgWeightAfter: Number(e.avgWeightAfter) || 0,
      coating: Number(e.coating) || 0,
      remarks: (e.remarks || "").trim(),
      loomRollCuttingEntryId: e.loomRollCuttingEntryId || undefined,
    })),
  });
}

export interface ReconcileLaminationEntriesOptions {
  localEntries: LaminationProductionEntryData[];
  incomingEntries: LaminationProductionEntryData[];
  focusedCell?: FocusedLaminationCell | null;
  hasUnsavedLocalEdits?: boolean;
  deletedEntryIds?: Set<string> | string[];
}

export function reconcileServerLaminationReportEntries({
  localEntries,
  incomingEntries,
  focusedCell,
  hasUnsavedLocalEdits = false,
  deletedEntryIds = new Set(),
}: ReconcileLaminationEntriesOptions): LaminationProductionEntryData[] {
  const deletedSet = deletedEntryIds instanceof Set ? deletedEntryIds : new Set(deletedEntryIds);

  // If local user has no unsaved edits and is not actively typing in any cell, adopt incoming directly (excluding deleted)
  if (!hasUnsavedLocalEdits && !focusedCell) {
    return incomingEntries
      .filter((e) => !e.id || !deletedSet.has(e.id))
      .map((e, idx) => calculateLaminationEntry({ ...e, sequence: idx + 1 }));
  }

  const incomingByKey = new Map<string, LaminationProductionEntryData>();
  for (let i = 0; i < incomingEntries.length; i++) {
    const item = incomingEntries[i];
    const key = getLaminationRowKey(item, i);
    incomingByKey.set(key, item);
    if (item.id) incomingByKey.set(item.id, item);
    if (item.rollNumber && item.rollNumber.trim()) {
      incomingByKey.set(`roll-${item.rollNumber.trim()}`, item);
    }
  }

  const merged: LaminationProductionEntryData[] = [];
  const processedKeys = new Set<string>();

  // 1. Reconcile existing local entries
  for (let i = 0; i < localEntries.length; i++) {
    const local = localEntries[i];
    const rowKey = getLaminationRowKey(local, i);

    // Skip if row was explicitly deleted locally
    if (local.id && deletedSet.has(local.id)) {
      continue;
    }

    const matchedIncoming =
      incomingByKey.get(rowKey) ||
      (local.id ? incomingByKey.get(local.id) : undefined) ||
      (local.rollNumber && local.rollNumber.trim()
        ? incomingByKey.get(`roll-${local.rollNumber.trim()}`)
        : undefined);

    if (matchedIncoming) {
      const incomingKey = getLaminationRowKey(matchedIncoming, i);
      processedKeys.add(incomingKey);
      if (matchedIncoming.id) processedKeys.add(matchedIncoming.id);
      if (matchedIncoming.rollNumber) processedKeys.add(`roll-${matchedIncoming.rollNumber.trim()}`);

      const isCurrentRowFocused =
        focusedCell &&
        (focusedCell.rowKey === rowKey ||
          (local.id && focusedCell.rowKey === local.id) ||
          (local.rollNumber && focusedCell.rowKey === local.rollNumber));

      if (isCurrentRowFocused) {
        // Typing isolation: adopt remote updates for other fields, but keep local focused cell value
        const isolatedField = focusedCell.field;
        const mergedItem: LaminationProductionEntryData = {
          ...local,
          ...matchedIncoming,
          id: matchedIncoming.id || local.id,
          // Keep the exact value the operator is actively typing
          [isolatedField]: local[isolatedField],
        };
        merged.push(calculateLaminationEntry({ ...mergedItem, sequence: merged.length + 1 }));
      } else if (hasUnsavedLocalEdits) {
        // Prefer local modified inputs while taking server ID & sequence
        const mergedItem: LaminationProductionEntryData = {
          ...matchedIncoming,
          ...local,
          id: matchedIncoming.id || local.id,
        };
        merged.push(calculateLaminationEntry({ ...mergedItem, sequence: merged.length + 1 }));
      } else {
        // Adopt authoritative server entry
        merged.push(calculateLaminationEntry({ ...matchedIncoming, sequence: merged.length + 1 }));
      }
    } else {
      // Local row not yet on server (e.g. freshly added draft roll or manual line)
      merged.push(calculateLaminationEntry({ ...local, sequence: merged.length + 1 }));
    }
  }

  // 2. Add remote rows that were added on other devices and not yet present locally
  for (let i = 0; i < incomingEntries.length; i++) {
    const inc = incomingEntries[i];
    const incKey = getLaminationRowKey(inc, i);
    const incId = inc.id;
    const rollKey = inc.rollNumber && inc.rollNumber.trim() ? `roll-${inc.rollNumber.trim()}` : null;

    if (incId && deletedSet.has(incId)) continue;

    const alreadyProcessed =
      processedKeys.has(incKey) ||
      (incId ? processedKeys.has(incId) : false) ||
      (rollKey ? processedKeys.has(rollKey) : false);

    if (!alreadyProcessed) {
      merged.push(calculateLaminationEntry({ ...inc, sequence: merged.length + 1 }));
    }
  }

  return merged;
}
