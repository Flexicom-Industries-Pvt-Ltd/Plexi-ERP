import { db } from "@/lib/db";
import { DocumentStatus, GateEntryStatus } from "@/generated/prisma";

export interface GateOutBlockerDetails {
  title?: string;
  description?: string;
  entryNumber: string;
  truckNumber: string;
  purpose: string;
  unverifiedDocuments: Array<{
    id: string;
    documentType: string;
    status: string;
    remarks?: string | null;
  }>;
  uncommittedStock: Array<{
    id: string;
    materialName: string;
    quantity: number;
    unit: string;
    batchLot?: string | null;
  }>;
}

export type GateOutValidationResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      code: "DOCUMENTS_PENDING" | "STOCK_PENDING" | "STATUS_INVALID" | "NOT_FOUND";
      blockers?: GateOutBlockerDetails;
    };

export async function validateGateOut(gateEntryId: string): Promise<GateOutValidationResult> {
  const entry = await db.gateEntry.findUnique({
    where: { id: gateEntryId },
    include: { documents: true, stockDetails: true },
  });

  if (!entry) {
    return { ok: false, error: "Gate entry not found", code: "NOT_FOUND" };
  }

  if (entry.status === GateEntryStatus.GATE_OUT) {
    return { ok: false, error: "Entry has already exited the gate", code: "STATUS_INVALID" };
  }

  if (entry.status !== GateEntryStatus.COMPLETED) {
    return {
      ok: false,
      error: "Entry must be COMPLETED before gate-out. Advance through loading/unloading first.",
      code: "STATUS_INVALID",
    };
  }

  const unverified = entry.documents.filter((d) => d.status !== DocumentStatus.VERIFIED);
  const uncommitted = entry.stockDetails.filter((s) => s.actualQuantity == null);

  if (unverified.length > 0 || uncommitted.length > 0) {
    const blockers: GateOutBlockerDetails = {
      title: "Gate Out Clearance Blocked",
      description:
        "This vehicle cannot depart the factory premises. All required documents must be verified and consignment stock must be reconciled before final exit clearance.",
      entryNumber: entry.entryNumber,
      truckNumber: entry.truckNumber,
      purpose: entry.purpose,
      unverifiedDocuments: unverified.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        status: d.status,
        remarks: d.remarks,
      })),
      uncommittedStock: uncommitted.map((s) => ({
        id: s.id,
        materialName: s.materialName,
        quantity: s.quantity,
        unit: s.unit,
        batchLot: s.batchLot,
      })),
    };

    if (unverified.length > 0 && uncommitted.length > 0) {
      return {
        ok: false,
        error: `Gate Out blocked: ${unverified.length} document(s) pending verification and ${uncommitted.length} stock line(s) pending inventory confirmation.`,
        code: "DOCUMENTS_PENDING",
        blockers,
      };
    }

    if (unverified.length > 0) {
      return {
        ok: false,
        error: `All documents must be verified before gate-out (${unverified.length} pending/rejected)`,
        code: "DOCUMENTS_PENDING",
        blockers,
      };
    }

    if (uncommitted.length > 0) {
      const msg =
        entry.purpose === "UNLOADING"
          ? `All stock lines must be received into inventory before gate-out (${uncommitted.length} line(s) pending)`
          : `All loading quantities must be confirmed before gate-out (${uncommitted.length} line(s) pending)`;
      return {
        ok: false,
        error: msg,
        code: "STOCK_PENDING",
        blockers,
      };
    }
  }

  return { ok: true };
}
