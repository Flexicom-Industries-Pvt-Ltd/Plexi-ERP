import { db } from "@/lib/db";
import { DocumentStatus, GateEntryStatus } from "@/generated/prisma";

export type GateOutValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export async function validateGateOut(gateEntryId: string): Promise<GateOutValidationResult> {
  const entry = await db.gateEntry.findUnique({
    where: { id: gateEntryId },
    include: { documents: true, stockDetails: true },
  });

  if (!entry) {
    return { ok: false, error: "Gate entry not found" };
  }

  if (entry.status === GateEntryStatus.GATE_OUT) {
    return { ok: false, error: "Entry has already exited the gate" };
  }

  if (entry.status !== GateEntryStatus.COMPLETED) {
    return {
      ok: false,
      error: "Entry must be COMPLETED before gate-out. Advance through loading/unloading first.",
    };
  }

  if (entry.documents.length > 0) {
    const unverified = entry.documents.filter((d) => d.status !== DocumentStatus.VERIFIED);
    if (unverified.length > 0) {
      return {
        ok: false,
        error: `All documents must be verified before gate-out (${unverified.length} pending/rejected)`,
      };
    }
  }

  if (entry.purpose === "UNLOADING" && entry.stockDetails.length > 0) {
    const uncommitted = entry.stockDetails.filter((s) => s.actualQuantity == null);
    if (uncommitted.length > 0) {
      return {
        ok: false,
        error: "All stock lines must be received into inventory before gate-out",
      };
    }
  }

  if (entry.purpose === "LOADING" && entry.stockDetails.length > 0) {
    const uncommitted = entry.stockDetails.filter((s) => s.actualQuantity == null);
    if (uncommitted.length > 0) {
      return {
        ok: false,
        error: "All loading quantities must be confirmed before gate-out",
      };
    }
  }

  return { ok: true };
}
