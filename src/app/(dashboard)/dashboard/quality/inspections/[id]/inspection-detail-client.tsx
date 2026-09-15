"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Factory,
  FileCheck2,
  Loader2,
  Package,
  RotateCcw,
  Scale,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

export function InspectionDetailClient({ inspectionId }: { inspectionId: string }) {
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchInspection = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quality/inspections/${inspectionId}`);
      if (!res.ok) throw new Error("Inspection record not found");
      const data = await res.json();
      setInspection(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load inspection record");
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        Loading inspection certificate...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">QC Inspection certificate not found.</p>
        <Link
          href="/dashboard/quality"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to Quality Control
        </Link>
      </div>
    );
  }

  const getDecisionBadge = (decision: string | null) => {
    switch (decision) {
      case "PASSED":
        return (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 border border-emerald-200">
            <CheckCircle2 className="size-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-emerald-900">QUALITY VERIFIED — PASSED</h3>
              <p className="text-xs text-emerald-700">
                Item meets all quality tolerances and is certified for downstream production or dispatch.
              </p>
            </div>
          </div>
        );
      case "FAILED":
        return (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 border border-rose-200">
            <XCircle className="size-8 text-rose-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-rose-900">QUALITY REJECTED — FAILED</h3>
              <p className="text-xs text-rose-700">
                Item failed conformance checks and is quarantined for scrap or recycling.
              </p>
            </div>
          </div>
        );
      case "REWORK":
        return (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 border border-amber-200">
            <RotateCcw className="size-8 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-amber-900">REWORK REQUIRED</h3>
              <p className="text-xs text-amber-700">
                Item requires corrective processing before re-inspection.
              </p>
            </div>
          </div>
        );
      case "ON_HOLD":
        return (
          <div className="flex items-center gap-2 rounded-xl bg-purple-50 p-4 border border-purple-200">
            <AlertCircle className="size-8 text-purple-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-purple-900">ON HOLD / UNDER REVIEW</h3>
              <p className="text-xs text-purple-700">
                Item is flagged for supervisory review and laboratory testing.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 rounded-xl bg-sky-50 p-4 border border-sky-200">
            <Clock className="size-8 text-sky-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-sky-900">INSPECTION PENDING</h3>
              <p className="text-xs text-sky-700">
                Inspection started but final verdict has not yet been submitted.
              </p>
            </div>
          </div>
        );
    }
  };

  const target = inspection.target;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard/quality"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition"
          >
            <ArrowLeft className="size-3.5" />
            Quality Control Center
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileCheck2 className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Certificate {inspection.inspectionNumber}
              </h1>
              <p className="text-xs text-muted-foreground">
                Inspection Record for {inspection.referenceType} · ID: {inspection.referenceId}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {inspection.referenceType === "ROLL" && (
            <Link
              href={`/dashboard/production/rolls/${inspection.referenceId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <ExternalLink className="size-3.5" /> View Roll
            </Link>
          )}
        </div>
      </div>

      {/* Decision Banner */}
      {getDecisionBadge(inspection.decision)}

      {/* Grid: Details & Target Entity */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Certificate Metadata */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Inspection Details
          </h2>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{inspection.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inspector</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {inspection.inspector?.name || "System Inspector"}
              </dd>
              {inspection.inspector?.employeeId && (
                <dd className="text-slate-500">{inspection.inspector.employeeId}</dd>
              )}
            </div>
            <div>
              <dt className="text-muted-foreground">Samples Inspected</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{inspection.samplesInspected} units</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created At</dt>
              <dd className="mt-0.5 text-slate-800">
                {format(new Date(inspection.createdAt), "dd MMM yyyy HH:mm:ss")}
              </dd>
            </div>
            {inspection.inspectedAt && (
              <div>
                <dt className="text-muted-foreground">Completed At</dt>
                <dd className="mt-0.5 text-slate-800">
                  {format(new Date(inspection.inspectedAt), "dd MMM yyyy HH:mm:ss")}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Target Entity Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 md:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Target Production Entity
          </h2>
          {target ? (
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-muted-foreground">Entity Identifier:</span>
                <p className="mt-0.5 font-bold text-slate-900">
                  {target.rollNumber || target.baleNumber || target.id}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Item / Material:</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {target.inventoryItem?.code || target.product?.code || "—"}
                </p>
                <p className="text-slate-600 truncate">
                  {target.inventoryItem?.name || target.product?.name || "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Weight / Quantity:</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {target.weight != null ? `${target.weight} kg` : ""}
                  {target.length != null ? ` · ${target.length}m` : ""}
                  {target.quantity != null ? `${target.quantity} bags` : ""}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Batch / Lot:</span>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {target.batchLot || target.productionBatch || "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Direct metadata not cached for reference ID: {inspection.referenceId}
            </p>
          )}

          {/* Observations and Defect Notes */}
          {(inspection.defectReason || inspection.reworkInstructions || inspection.notes) && (
            <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-xs">
              {inspection.defectReason && (
                <div>
                  <span className="font-semibold text-rose-700">Defect Classification:</span>
                  <p className="mt-0.5 text-rose-900 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    {inspection.defectReason}
                  </p>
                </div>
              )}
              {inspection.reworkInstructions && (
                <div>
                  <span className="font-semibold text-amber-700">Rework Instructions:</span>
                  <p className="mt-0.5 text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    {inspection.reworkInstructions}
                  </p>
                </div>
              )}
              {inspection.notes && (
                <div>
                  <span className="font-semibold text-slate-700">Inspector Notes:</span>
                  <p className="mt-0.5 text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {inspection.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Parameter Test Lines Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Parameter Test Readings & Tolerance Results
        </h2>
        {inspection.lines && inspection.lines.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Parameter Checked</th>
                  <th className="px-4 py-2.5">Standard Tolerance</th>
                  <th className="px-4 py-2.5">Actual Measured Reading</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Line Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspection.lines.map((line: any) => (
                  <tr key={line.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{line.parameterName}</td>
                    <td className="px-4 py-3 text-slate-600">{line.standardValue || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{line.actualValue}</td>
                    <td className="px-4 py-3 text-slate-500">{line.unit || "—"}</td>
                    <td className="px-4 py-3">
                      {line.status === "PASSED" ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                          <XCircle className="size-3.5" /> Fail
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No parameter line checks recorded for this inspection certificate.
          </p>
        )}
      </div>
    </div>
  );
}
