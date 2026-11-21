import {
  LoomRollCuttingEntryItem,
  computeRollMeters,
  computeRollWeightsAndAvg,
} from "./loom-roll-cutting-types";

export interface ActiveFocusedRollCell {
  rollKey: string;
  field: string;
}

export function getRollCuttingEntryKey(entry: LoomRollCuttingEntryItem, index?: number): string {
  if (entry.id) return entry.id;
  if (entry.rollNumber && entry.rollNumber.trim()) return entry.rollNumber.trim();
  return `seq_${entry.sequence || index || 0}`;
}

export interface RollCuttingReportMetadata {
  supervisorName?: string;
  supervisorId?: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  status?: string;
  remarks?: string;
}

/**
 * Deterministic serializer for Loom Roll Cutting payloads to eliminate
 * false-positive dirty diffs and infinite auto-save cycles.
 */
export function serializeRollCuttingPayload(
  date: string,
  shiftName: string,
  entries: LoomRollCuttingEntryItem[],
  metadata?: RollCuttingReportMetadata
): string {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.sequence !== b.sequence) return (a.sequence || 0) - (b.sequence || 0);
    return (a.rollNumber || "").localeCompare(b.rollNumber || "");
  });

  return JSON.stringify({
    date,
    shiftName,
    supervisorName: (metadata?.supervisorName || "").trim(),
    status: (metadata?.status || "DRAFT").trim(),
    remarks: (metadata?.remarks || "").trim(),
    entries: sortedEntries.map((e) => ({
      id: e.id || undefined,
      sequence: e.sequence,
      rollNumber: (e.rollNumber || "").trim(),
      loomNumber: Number(e.loomNumber) || 0,
      size: (e.size || "").trim(),
      qualityType: (e.qualityType || "").trim(),
      contractor: (e.contractor || "").trim(),
      initialReading: e.initialReading !== null && e.initialReading !== undefined && !isNaN(Number(e.initialReading)) ? Number(e.initialReading) : 0,
      finalReading: e.finalReading !== null && e.finalReading !== undefined && !isNaN(Number(e.finalReading)) ? Number(e.finalReading) : 0,
      grossWeightKg: e.grossWeightKg !== null && e.grossWeightKg !== undefined && e.grossWeightKg !== "" && !isNaN(Number(e.grossWeightKg)) ? Number(e.grossWeightKg) : "",
      tareWeightKg: e.tareWeightKg !== null && e.tareWeightKg !== undefined && e.tareWeightKg !== "" && !isNaN(Number(e.tareWeightKg)) ? Number(e.tareWeightKg) : 1.2,
      supervisorSign: (e.supervisorSign || "").trim(),
      remarks: (e.remarks || "").trim(),
      photoUrl: e.photoUrl || null,
    })),
  });
}

/**
 * Three-way non-destructive reconciliation for Loom Roll Cutting entries.
 * Isolates actively focused cell typing from remote concurrent updates.
 */
export function reconcileServerRollCuttingEntries(
  localEntries: LoomRollCuttingEntryItem[],
  incomingServerEntries: LoomRollCuttingEntryItem[],
  activeCell: ActiveFocusedRollCell | null,
  deletedRollKeys?: Set<string>
): LoomRollCuttingEntryItem[] {
  const localMap = new Map<string, LoomRollCuttingEntryItem>();
  for (let i = 0; i < localEntries.length; i++) {
    const key = getRollCuttingEntryKey(localEntries[i], i);
    localMap.set(key, localEntries[i]);
  }

  const serverMap = new Map<string, LoomRollCuttingEntryItem>();
  for (let i = 0; i < incomingServerEntries.length; i++) {
    const key = getRollCuttingEntryKey(incomingServerEntries[i], i);
    serverMap.set(key, incomingServerEntries[i]);
  }

  const allKeys = new Set<string>();
  for (const k of localMap.keys()) allKeys.add(k);
  for (const k of serverMap.keys()) allKeys.add(k);

  const merged: LoomRollCuttingEntryItem[] = [];

  for (const key of allKeys) {
    if (deletedRollKeys && deletedRollKeys.has(key)) {
      continue;
    }

    const local = localMap.get(key);
    const server = serverMap.get(key);

    if (server && !local) {
      // Remote addition by another user
      const init = Number(server.initialReading) || 0;
      const final = Number(server.finalReading) || 0;
      const meter = computeRollMeters(init, final);
      const gross = server.grossWeightKg !== "" && server.grossWeightKg !== undefined ? Number(server.grossWeightKg) : 0;
      const tare = server.tareWeightKg !== "" && server.tareWeightKg !== undefined ? Number(server.tareWeightKg) : 1.2;
      const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(meter, gross, tare);

      merged.push({
        ...server,
        meter,
        nettWeightKg,
        avgWeightPerMeter,
      });
      continue;
    }

    if (!server && local) {
      // Local addition not yet landed on server
      const init = Number(local.initialReading) || 0;
      const final = Number(local.finalReading) || 0;
      const meter = computeRollMeters(init, final);
      const gross = local.grossWeightKg !== "" && local.grossWeightKg !== undefined ? Number(local.grossWeightKg) : 0;
      const tare = local.tareWeightKg !== "" && local.tareWeightKg !== undefined ? Number(local.tareWeightKg) : 1.2;
      const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(meter, gross, tare);

      merged.push({
        ...local,
        meter,
        nettWeightKg,
        avgWeightPerMeter,
      });
      continue;
    }

    if (server && local) {
      const mergedRow: LoomRollCuttingEntryItem = {
        ...server,
        photoUrl: server.photoUrl !== undefined ? (server.photoUrl || null) : (local.photoUrl || null),
      };

      // ACTIVE FOCUSED CELL ISOLATION (Google Docs-Grade):
      // If the local operator is actively typing in a field for this exact roll,
      // preserve local draft value to prevent cursor jumps and dropped keystrokes.
      if (
        activeCell &&
        (key === activeCell.rollKey ||
          local.id === activeCell.rollKey ||
          local.rollNumber === activeCell.rollKey)
      ) {
        const fieldKey = activeCell.field as keyof LoomRollCuttingEntryItem;
        if (fieldKey && fieldKey in local) {
          (mergedRow as any)[fieldKey] = (local as any)[fieldKey];
        }
      }

      const init = Number(mergedRow.initialReading) || 0;
      const final = Number(mergedRow.finalReading) || 0;
      const meter = computeRollMeters(init, final);
      const gross = mergedRow.grossWeightKg !== "" && mergedRow.grossWeightKg !== undefined ? Number(mergedRow.grossWeightKg) : 0;
      const tare = mergedRow.tareWeightKg !== "" && mergedRow.tareWeightKg !== undefined ? Number(mergedRow.tareWeightKg) : 1.2;
      const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(meter, gross, tare);

      merged.push({
        ...mergedRow,
        meter,
        nettWeightKg,
        avgWeightPerMeter,
      });
    }
  }

  // Deterministic sort by sequence ASC, then rollNumber ASC
  merged.sort((a, b) => {
    if (a.sequence !== b.sequence) return (a.sequence || 0) - (b.sequence || 0);
    return (a.rollNumber || "").localeCompare(b.rollNumber || "");
  });

  return merged;
}
