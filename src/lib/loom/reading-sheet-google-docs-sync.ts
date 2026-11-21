import {
  LoomReadingEntryItem,
  computeIntervalDeltas,
  computeLoomEfficiency,
} from "./loom-reading-types";

export interface ActiveFocusedCell {
  loomNumber: number;
  rowSequence: number;
  field: string;
}

export function getLoomEntryKey(loomNumber: number, rowSequence: number = 1): string {
  return `${loomNumber}_${rowSequence || 1}`;
}

export interface LoomReadingSheetMetadata {
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  totalWastageKg?: number | string;
  remarks?: string;
  status?: string;
  shiftHours?: number;
  timeSlots?: string[];
  initialTimeSlot?: string;
}

/**
 * Deterministic serializer for Loom Reading Sheet payloads to prevent
 * false-positive dirty diffs and infinite auto-save cycles.
 */
export function serializeLoomReadingPayload(
  date: string,
  shiftName: string,
  entries: LoomReadingEntryItem[],
  metadata?: LoomReadingSheetMetadata
): string {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.loomNumber !== b.loomNumber) return a.loomNumber - b.loomNumber;
    return (a.rowSequence || 1) - (b.rowSequence || 1);
  });

  return JSON.stringify({
    date,
    shiftName,
    preparedBy: (metadata?.preparedBy || "").trim(),
    checkedBy: (metadata?.checkedBy || "").trim(),
    approvedBy: (metadata?.approvedBy || "").trim(),
    totalWastageKg: parseFloat(String(metadata?.totalWastageKg || 0)) || 0,
    remarks: (metadata?.remarks || "").trim(),
    status: (metadata?.status || "DRAFT").trim(),
    entries: sortedEntries.map((e) => ({
      loomNumber: e.loomNumber,
      rowSequence: e.rowSequence || 1,
      operatorName: e.operatorName ? e.operatorName.trim() : null,
      size: e.size ? e.size.trim() : null,
      denier: e.denier ? e.denier.trim() : null,
      qualityType: e.qualityType ? e.qualityType.trim() : null,
      initialReading: e.initialReading !== null && e.initialReading !== undefined && !isNaN(Number(e.initialReading)) ? Number(e.initialReading) : null,
      r1Reading: e.r1Reading !== null && e.r1Reading !== undefined && !isNaN(Number(e.r1Reading)) ? Number(e.r1Reading) : null,
      r2Reading: e.r2Reading !== null && e.r2Reading !== undefined && !isNaN(Number(e.r2Reading)) ? Number(e.r2Reading) : null,
      r3Reading: e.r3Reading !== null && e.r3Reading !== undefined && !isNaN(Number(e.r3Reading)) ? Number(e.r3Reading) : null,
      r4Reading: e.r4Reading !== null && e.r4Reading !== undefined && !isNaN(Number(e.r4Reading)) ? Number(e.r4Reading) : null,
      r5Reading: e.r5Reading !== null && e.r5Reading !== undefined && !isNaN(Number(e.r5Reading)) ? Number(e.r5Reading) : null,
      r6Reading: e.r6Reading !== null && e.r6Reading !== undefined && !isNaN(Number(e.r6Reading)) ? Number(e.r6Reading) : null,
      breakdownReason: e.breakdownReason || null,
      breakdownMinutes: Number(e.breakdownMinutes) || 0,
      changeoverTargetQuality: e.changeoverTargetQuality || null,
      status: e.status || "RUNNING",
      remarks: e.remarks ? e.remarks.trim() : null,
      photoUrl: e.photoUrl || null,
      intervalPhotos: e.intervalPhotos || null,
    })),
  });
}

/**
 * Three-way non-destructive reconciliation for Loom Reading Sheet entries.
 * Isolates actively focused cell typing from remote concurrent updates.
 */
export function reconcileServerLoomReadings(
  localEntries: LoomReadingEntryItem[],
  incomingServerEntries: LoomReadingEntryItem[],
  activeCell: ActiveFocusedCell | null,
  deletedKeys?: Set<string>,
  shiftHours: number = 12
): LoomReadingEntryItem[] {
  const localMap = new Map<string, LoomReadingEntryItem>();
  for (const l of localEntries) {
    localMap.set(getLoomEntryKey(l.loomNumber, l.rowSequence), l);
  }

  const serverMap = new Map<string, LoomReadingEntryItem>();
  for (const s of incomingServerEntries) {
    serverMap.set(getLoomEntryKey(s.loomNumber, s.rowSequence), s);
  }

  const allKeys = new Set<string>();
  for (const k of localMap.keys()) allKeys.add(k);
  for (const k of serverMap.keys()) allKeys.add(k);

  const merged: LoomReadingEntryItem[] = [];

  for (const key of allKeys) {
    if (deletedKeys && deletedKeys.has(key)) {
      continue;
    }

    const local = localMap.get(key);
    const server = serverMap.get(key);

    if (server && !local) {
      const deltas = computeIntervalDeltas(server);
      const eff = computeLoomEfficiency(
        deltas.totalProduction,
        server.qualityType,
        Number(server.breakdownMinutes) || 0,
        shiftHours
      );
      merged.push({
        ...server,
        ...deltas,
        efficiencyPct: eff.efficiencyPct,
      });
      continue;
    }

    if (!server && local) {
      // Local addition (e.g. split changeover row not yet confirmed by server)
      const deltas = computeIntervalDeltas(local);
      const eff = computeLoomEfficiency(
        deltas.totalProduction,
        local.qualityType,
        Number(local.breakdownMinutes) || 0,
        shiftHours
      );
      merged.push({
        ...local,
        ...deltas,
        efficiencyPct: eff.efficiencyPct,
      });
      continue;
    }

    if (server && local) {
      // Server is authoritative for confirmed row data
      const mergedRow: LoomReadingEntryItem = {
        ...server,
        photoUrl: server.photoUrl !== undefined ? (server.photoUrl || null) : (local.photoUrl || null),
        intervalPhotos: server.intervalPhotos !== undefined ? (server.intervalPhotos || null) : (local.intervalPhotos || null),
      };

      // ACTIVE FOCUSED CELL ISOLATION (Google Docs-Grade):
      // If local user is actively typing in a cell on this exact loom & rowSequence,
      // preserve local value so keystrokes are never dropped or overwritten!
      if (
        activeCell &&
        activeCell.loomNumber === local.loomNumber &&
        (activeCell.rowSequence || 1) === (local.rowSequence || 1)
      ) {
        const fieldKey = activeCell.field as keyof LoomReadingEntryItem;
        if (fieldKey && fieldKey in local) {
          (mergedRow as any)[fieldKey] = (local as any)[fieldKey];
        }
      }

      const deltas = computeIntervalDeltas(mergedRow);
      const eff = computeLoomEfficiency(
        deltas.totalProduction,
        mergedRow.qualityType,
        Number(mergedRow.breakdownMinutes) || 0,
        shiftHours
      );

      merged.push({
        ...mergedRow,
        ...deltas,
        efficiencyPct: eff.efficiencyPct,
      });
    }
  }

  // Deterministic sort: loomNumber ASC, rowSequence ASC
  merged.sort((a, b) => {
    if (a.loomNumber !== b.loomNumber) return a.loomNumber - b.loomNumber;
    return (a.rowSequence || 1) - (b.rowSequence || 1);
  });

  return merged;
}
