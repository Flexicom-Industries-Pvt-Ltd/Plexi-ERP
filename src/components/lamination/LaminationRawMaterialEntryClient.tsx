"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Save,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Minus,
  Equal,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  RotateCcw,
  FlaskConical,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  calculateRawMaterialRow,
  computeRawMaterialTotals,
  LaminationRawMaterialReportData,
  RawMaterialEntryItem,
} from "@/lib/lamination/lamination-raw-material-types";
import dynamic from "next/dynamic";
import { exportRawMaterialReportExcel } from "@/lib/lamination/raw-material-export";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";

const RawMaterialPrintModal = dynamic(
  () => import("./RawMaterialPrintModal").then((m) => m.RawMaterialPrintModal),
  { ssr: false }
);

const SHIFTS = ["Day Shift", "Night Shift"];

export function LaminationRawMaterialEntryClient() {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [operatorName, setOperatorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  // Input Totals at the top of cards
  const [manualTotalInput, setManualTotalInput] = useState<string>("");
  const [machineTotalInput, setMachineTotalInput] = useState<string>("");

  // Line items
  const [entries, setEntries] = useState<RawMaterialEntryItem[]>([]);
  const [masterMaterials, setMasterMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Fetch report for Date + Shift
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/production/lamination/raw-materials/reports?date=${encodeURIComponent(
          date
        )}&shiftName=${encodeURIComponent(shiftName)}`
      );
      const data = await res.json();

      if (data.success) {
        setMasterMaterials(data.masterMaterials || []);

        if (data.exists && data.report) {
          const rep = data.report;
          setOperatorName(rep.operatorName || "");
          setStatus(rep.status || "DRAFT");
          setRemarks(rep.remarks || "");
          setManualTotalInput(String(rep.manualTotalKg || 0));
          setMachineTotalInput(String(rep.machineTotalKg || 0));
          setEntries(rep.entries || []);
        } else {
          // Initialize fresh draft using master materials
          const initialEntries: RawMaterialEntryItem[] = (
            data.templateEntries || []
          ).map((t: any) => ({
            rawMaterialId: t.rawMaterialId,
            materialName: t.materialName,
            percentage: t.percentage,
            manualKg: 0,
            machineKg: 0,
            diffKg: 0,
            sequence: t.sequence,
            remarks: "",
          }));

          setEntries(initialEntries);
          setManualTotalInput("");
          setMachineTotalInput("");
          setOperatorName("");
          setStatus("DRAFT");
          setRemarks("");
        }
      } else {
        toast.error(data.error || "Failed to load report");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [date, shiftName]);

  // Handle Manual Total Input Change
  const handleManualTotalChange = (valStr: string) => {
    setManualTotalInput(valStr);
    const numTotal = parseFloat(valStr) || 0;

    setEntries((prev) =>
      prev.map((entry) => {
        const { manualKg, diffKg } = calculateRawMaterialRow(
          numTotal,
          entry.machineKg,
          entry.percentage
        );
        return {
          ...entry,
          manualKg,
          diffKg,
        };
      })
    );
  };

  // Handle Machine Total Input Change (auto-distributes to rows)
  const handleMachineTotalChange = (valStr: string) => {
    setMachineTotalInput(valStr);
    const numMachineTotal = parseFloat(valStr) || 0;
    const numManualTotal = parseFloat(manualTotalInput) || 0;

    setEntries((prev) =>
      prev.map((entry) => {
        const initialMachine = Number(
          ((numMachineTotal * (entry.percentage || 0)) / 100).toFixed(2)
        );
        const { manualKg, diffKg } = calculateRawMaterialRow(
          numManualTotal,
          initialMachine,
          entry.percentage
        );
        return {
          ...entry,
          manualKg,
          machineKg: initialMachine,
          diffKg,
        };
      })
    );
  };

  // Handle Individual Machine Row Value Edit
  const handleMachineRowChange = (index: number, valStr: string) => {
    const machineVal = parseFloat(valStr) || 0;
    const numManualTotal = parseFloat(manualTotalInput) || 0;

    setEntries((prev) => {
      const next = [...prev];
      const target = next[index];
      const { manualKg, diffKg } = calculateRawMaterialRow(
        numManualTotal,
        machineVal,
        target.percentage
      );
      next[index] = {
        ...target,
        manualKg,
        machineKg: machineVal,
        diffKg,
      };

      // Recalculate Machine Total sum
      const sumMachine = next.reduce(
        (sum, item) => sum + (Number(item.machineKg) || 0),
        0
      );
      setMachineTotalInput(String(Number(sumMachine.toFixed(2))));

      return next;
    });
  };

  // Handle Remarks Row Edit
  const handleRemarksChange = (index: number, val: string) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], remarks: val };
      return next;
    });
  };

  // Sync with Data Centre Master (keeps entered machine readings if matching)
  const handleSyncWithMaster = () => {
    if (!masterMaterials || masterMaterials.length === 0) {
      toast.info("No active materials found in Data Centre Master");
      return;
    }

    const numManualTotal = parseFloat(manualTotalInput) || 0;

    const mergedEntries: RawMaterialEntryItem[] = masterMaterials.map(
      (m, idx) => {
        const existing = entries.find(
          (e) => e.rawMaterialId === m.id || e.materialName === m.name
        );
        const machineKg = existing ? existing.machineKg : 0;
        const { manualKg, diffKg } = calculateRawMaterialRow(
          numManualTotal,
          machineKg,
          m.percentage
        );

        return {
          rawMaterialId: m.id,
          materialName: m.name,
          percentage: m.percentage,
          manualKg,
          machineKg,
          diffKg,
          sequence: m.sequence || idx + 1,
          remarks: existing?.remarks || "",
        };
      }
    );

    setEntries(mergedEntries);
    toast.success("Synchronized with Data Centre Master percentages");
  };

  // Computed totals
  const numManual = parseFloat(manualTotalInput) || 0;
  const totals = useMemo(() => {
    return computeRawMaterialTotals(entries, numManual);
  }, [entries, numManual]);

  // Save report
  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = {
          date,
          shiftName,
          operatorName: operatorName.trim() || null,
          manualTotalKg: totals.manualTotalKg,
          machineTotalKg: totals.machineTotalKg,
          diffTotalKg: totals.diffTotalKg,
          status,
          remarks: remarks.trim() || null,
          entries,
        };

        const res = await fetch("/api/production/lamination/raw-materials/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          toast.success("Lamination Raw Material report saved successfully");
          fetchReport();
        } else {
          toast.error(data.error || "Failed to save report");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error saving report");
      }
    });
  };

  // Current report data object for print and excel export
  const currentReportData: LaminationRawMaterialReportData = {
    date,
    shiftName,
    operatorName,
    manualTotalKg: totals.manualTotalKg,
    machineTotalKg: totals.machineTotalKg,
    diffTotalKg: totals.diffTotalKg,
    status,
    remarks,
    entries,
  };

  const netDiffSign = totals.diffTotalKg > 0 ? `+${totals.diffTotalKg}` : `${totals.diffTotalKg}`;
  const netDiffColor =
    totals.diffTotalKg > 0
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : totals.diffTotalKg < 0
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-slate-700 bg-slate-100 border-slate-200";

  return (
    <div className={`space-y-5 font-sans pb-16 ${
      isFullscreen
        ? "fixed inset-0 z-50 bg-background p-4 md:p-6 overflow-auto h-screen w-screen pb-6"
        : ""
    }`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title={isFullscreen ? "Collapse (Esc)" : "Expand to Fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Expand</span>
                </>
              )}
            </button>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                Raw Material Entry & Reconciliation
                <Badge
                  variant="outline"
                  className={
                    status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : status === "SUBMITTED"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {status}
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Compare theoretical manual recipe targets against actual machine dispenser inputs to evaluate shift material variance.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportRawMaterialReportExcel(currentReportData)}
            disabled={entries.length === 0}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            Excel Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={entries.length === 0}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 mr-1.5 text-sky-600" />
            Print Report
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncWithMaster}
            title="Sync with Data Centre Master"
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-600" />
            Sync Master
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || isLoading}
            className="h-9 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isPending ? "Saving..." : "Save Shift Report"}
          </Button>
        </div>
      </div>

      {/* Shift & Date Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Shift */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Shift
            </label>
            <Select
              value={shiftName}
              onValueChange={(val) => {
                if (val) setShiftName(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Shift" />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Operator / Technician
            </label>
            <UniversalPersonnelInput
              type="operator"
              section="LAMINATION"
              value={operatorName}
              onChange={(name) => setOperatorName(name)}
              placeholder="e.g. Ramesh Kumar"
              inputClassName="h-9"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(val: any) => {
                if (val) setStatus(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT" className="text-xs">Draft</SelectItem>
                <SelectItem value="SUBMITTED" className="text-xs">Submitted</SelectItem>
                <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Remarks Input */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Shift Remarks:
          </span>
          <Input
            placeholder="Optional production notes, hopper balance, polymer grades..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="h-8.5 text-xs bg-slate-50/50"
          />
        </div>
      </div>

      {/* 3-Section Bento Grid: Manual - Machine = Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* CARD 1: MANUAL USAGE (Theoretical Recipe) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-sky-50/70 border-b border-sky-100 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-600"></span>
              <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                1. Manual Input
              </h3>
            </div>
            <span className="text-[11px] text-sky-700 font-semibold">
              Recipe Target
            </span>
          </div>

          <div className="p-3 bg-sky-50/30 border-b border-slate-100">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
              Total Usage (kg)
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="Enter Total Usage (e.g. 1000)"
                value={manualTotalInput}
                onChange={(e) => handleManualTotalChange(e.target.value)}
                className="h-10 text-sm font-bold bg-white text-slate-900 border-sky-200 focus-visible:ring-sky-500 pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                kg
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Entering total will auto-calculate material quantities by percentage.
            </p>
          </div>

          {/* Rows for Manual */}
          <div className="p-2 space-y-1.5 flex-1">
            {entries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No materials configured in Data Centre.
              </p>
            ) : (
              entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-50/80 border border-slate-100 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-900 truncate">
                      {entry.materialName}
                    </p>
                    <span className="text-[10px] font-mono text-sky-700 font-bold">
                      {Number(entry.percentage).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">
                      {Number(entry.manualKg).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">kg</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Total for Manual */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wide">
              Total Manual Target:
            </span>
            <div className="text-right">
              <span className="font-extrabold text-sky-800 text-sm">
                {totals.manualTotalKg.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-[11px] font-medium text-slate-500 ml-1">kg</span>
              <div className="text-[10px] text-slate-500">
                Recipe: {totals.totalPercentage}%
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: MACHINE USAGE (Actual Meter / Hopper Reading) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-purple-50/70 border-b border-purple-100 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-600"></span>
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                2. Machine Input
              </h3>
            </div>
            <span className="text-[11px] text-purple-700 font-semibold">
              Actual Meter / Hopper
            </span>
          </div>

          <div className="p-3 bg-purple-50/30 border-b border-slate-100">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
              Machine Total (kg)
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="Distribute Total or Type Rows"
                value={machineTotalInput}
                onChange={(e) => handleMachineTotalChange(e.target.value)}
                className="h-10 text-sm font-bold bg-white text-slate-900 border-purple-200 focus-visible:ring-purple-500 pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                kg
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Enter total to auto-fill by %, then adjust individual rows if machine varied.
            </p>
          </div>

          {/* Rows for Machine (Fully Editable) */}
          <div className="p-2 space-y-1.5 flex-1">
            {entries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No materials configured.
              </p>
            ) : (
              entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 rounded bg-slate-50/80 border border-slate-100 text-xs gap-2"
                >
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {entry.materialName}
                    </p>
                    <span className="text-[10px] text-purple-700 font-mono">
                      Ref: {entry.percentage}%
                    </span>
                  </div>
                  <div className="w-28 relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={entry.machineKg === 0 && !machineTotalInput ? "" : entry.machineKg}
                      onChange={(e) => handleMachineRowChange(idx, e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-right font-bold text-slate-900 text-xs pr-6 bg-white border-purple-200 focus-visible:ring-purple-500"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Total for Machine */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wide">
              Total Machine Actual:
            </span>
            <div className="text-right">
              <span className="font-extrabold text-purple-800 text-sm">
                {totals.machineTotalKg.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-[11px] font-medium text-slate-500 ml-1">kg</span>
            </div>
          </div>
        </div>

        {/* CARD 3: DIFFERENCE SUMMARY (Manual - Machine) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-emerald-50/70 border-b border-emerald-100 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                3. Diff (Manual − Machine)
              </h3>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Variance
            </span>
          </div>

          <div className="p-3 bg-emerald-50/30 border-b border-slate-100">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
              Net Shift Difference
            </label>
            <div className={`h-10 px-3 rounded-md border flex items-center justify-between font-bold text-sm ${netDiffColor}`}>
              <span>{netDiffSign} kg</span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold border-current">
                {totals.diffTotalKg > 0 ? "Material Saved" : totals.diffTotalKg < 0 ? "Excess Used" : "Balanced"}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Machine input is subtracted from manual target as configured.
            </p>
          </div>

          {/* Rows for Difference */}
          <div className="p-2 space-y-1.5 flex-1">
            {entries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No materials.
              </p>
            ) : (
              entries.map((entry, idx) => {
                const diffVal = Number(entry.diffKg.toFixed(2));
                const sign = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;
                const rowClass =
                  diffVal > 0
                    ? "text-emerald-700 bg-emerald-50/60 border-emerald-100"
                    : diffVal < 0
                    ? "text-amber-700 bg-amber-50/60 border-amber-100"
                    : "text-slate-700 bg-slate-50/60 border-slate-100";

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded border text-xs ${rowClass}`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold truncate">
                        {entry.materialName}
                      </p>
                      <span className="text-[10px] opacity-75 font-mono">
                        Target: {entry.manualKg}kg | Machine: {entry.machineKg}kg
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm">{sign}</span>
                      <span className="text-[10px] ml-1">kg</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Total for Difference */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wide">
              Net Balance / Variance:
            </span>
            <div className="text-right">
              <span className={`font-extrabold text-sm ${totals.diffTotalKg > 0 ? "text-emerald-700" : totals.diffTotalKg < 0 ? "text-amber-700" : "text-slate-800"}`}>
                {netDiffSign}
              </span>
              <span className="text-[11px] font-medium text-slate-500 ml-1">kg</span>
              <div className="text-[10px] text-slate-500">
                Variance: {totals.variancePercentage}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Preview Modal */}
      <RawMaterialPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportData={currentReportData}
      />
    </div>
  );
}
