"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Building,
  Save,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Layers,
  Scale,
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
  calculateWastage,
  LaminationWastageReportData,
} from "@/lib/lamination/lamination-wastage-types";
import { WastagePrintModal } from "./WastagePrintModal";
import { exportWastageReportExcel } from "@/lib/lamination/wastage-export";

const SHIFTS = ["Day Shift", "Night Shift"];

export function LaminationWastageClient() {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [operatorName, setOperatorName] = useState<string>("");
  const [contractorName, setContractorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  // Base Quantities (auto-pulled from respective shift reports)
  const [rawMaterialUsedKg, setRawMaterialUsedKg] = useState<string>("");
  const [fabricNetWeightKg, setFabricNetWeightKg] = useState<string>("");

  // Wastage Inputs (manual entry by operator)
  const [lumpsWastageKg, setLumpsWastageKg] = useState<string>("");
  const [fabricWastageKg, setFabricWastageKg] = useState<string>("");

  // Sources status
  const [sources, setSources] = useState<{
    hasRawMaterialReport: boolean;
    hasProductionReport: boolean;
    sourceRawMaterialKg: number;
    sourceFabricNetWtKg: number;
  }>({
    hasRawMaterialReport: false,
    hasProductionReport: false,
    sourceRawMaterialKg: 0,
    sourceFabricNetWtKg: 0,
  });

  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();
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

  // Fetch contractors from Data Centre
  useEffect(() => {
    fetch("/api/data-centre/contractors?activeOnly=true")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setContractorsList(data);
        }
      })
      .catch((err) => console.error("Error fetching contractors:", err));
  }, []);

  // Fetch report for Date + Shift
  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/production/lamination/wastage?date=${encodeURIComponent(
          date
        )}&shiftName=${encodeURIComponent(shiftName)}`
      );
      const data = await res.json();

      if (data.success) {
        setSources(
          data.sources || {
            hasRawMaterialReport: false,
            hasProductionReport: false,
            sourceRawMaterialKg: 0,
            sourceFabricNetWtKg: 0,
          }
        );

        if (data.report) {
          const rep = data.report;
          setOperatorName(rep.operatorName || "");
          setContractorName(rep.contractorName || "");
          setStatus(rep.status || "DRAFT");
          setRemarks(rep.remarks || "");
          setRawMaterialUsedKg(String(rep.rawMaterialUsedKg || 0));
          setFabricNetWeightKg(String(rep.fabricNetWeightKg || 0));
          setLumpsWastageKg(rep.lumpsWastageKg > 0 ? String(rep.lumpsWastageKg) : "");
          setFabricWastageKg(rep.fabricWastageKg > 0 ? String(rep.fabricWastageKg) : "");
        }
      } else {
        toast.error(data.error || "Failed to load wastage report");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading wastage report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [date, shiftName]);

  // Real-time calculation
  const calculated = useMemo(() => {
    return calculateWastage(
      parseFloat(rawMaterialUsedKg) || 0,
      parseFloat(lumpsWastageKg) || 0,
      parseFloat(fabricNetWeightKg) || 0,
      parseFloat(fabricWastageKg) || 0
    );
  }, [rawMaterialUsedKg, lumpsWastageKg, fabricNetWeightKg, fabricWastageKg]);

  // Sync / pull fresh base quantities from Raw Material & Production reports
  const handleReSyncSources = () => {
    if (sources.sourceRawMaterialKg > 0) {
      setRawMaterialUsedKg(String(sources.sourceRawMaterialKg));
    }
    if (sources.sourceFabricNetWtKg > 0) {
      setFabricNetWeightKg(String(sources.sourceFabricNetWtKg));
    }
    toast.success("Synchronized base input quantities from shift reports");
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = {
          date,
          shiftName,
          operatorName: operatorName.trim() || null,
          contractorName: contractorName.trim() || null,
          rawMaterialUsedKg: calculated.rawMaterialUsedKg,
          lumpsWastageKg: calculated.lumpsWastageKg,
          fabricNetWeightKg: calculated.fabricNetWeightKg,
          fabricWastageKg: calculated.fabricWastageKg,
          status,
          remarks: remarks.trim() || null,
        };

        const res = await fetch("/api/production/lamination/wastage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          toast.success("Lamination Wastage report saved successfully");
          fetchReport();
        } else {
          toast.error(data.error || "Failed to save wastage report");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error saving report");
      }
    });
  };

  const currentReportData: LaminationWastageReportData = {
    date,
    shiftName,
    operatorName,
    contractorName,
    ...calculated,
    status,
    remarks,
  };

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                Lamination Wastage Report
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
                Track shift lumps and fabric trim wastage with live percentage calculation against production net weights.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportWastageReportExcel(currentReportData)}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            Excel Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 mr-1.5 text-sky-600" />
            Print Report
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReSyncSources}
            title="Re-sync base numbers from shift reports"
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Sync Sources
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || isLoading}
            className="h-9 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isPending ? "Saving..." : "Save Shift Wastage"}
          </Button>
        </div>
      </div>

      {/* Shift & Date Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
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
            <Input
              placeholder="e.g. Ramesh Kumar"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Contractor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              Contractor
            </label>
            {contractorsList.length > 0 ? (
              <Select
                value={contractorName || "NONE"}
                onValueChange={(val) => setContractorName(val === "NONE" || !val ? "" : val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Contractor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="text-xs">In-House / None</SelectItem>
                  {contractorsList.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Contractor Name"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="h-9 text-xs"
              />
            )}
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

        {/* Remarks and Source Indicators */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-500 font-medium">Remarks:</span>
            <Input
              placeholder="Startup lump purge, fabric rejection cause..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-8 text-xs bg-slate-50/50 w-full sm:w-96"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Raw Material Report:</span>
              {sources.hasRawMaterialReport ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Synced ({sources.sourceRawMaterialKg} kg)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0">
                  <AlertCircle className="h-2.5 w-2.5 mr-1" /> Not Found
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Production Sheet:</span>
              {sources.hasProductionReport ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Synced ({sources.sourceFabricNetWtKg} kg)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0">
                  <AlertCircle className="h-2.5 w-2.5 mr-1" /> Not Found
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sky-800 uppercase tracking-wider">
                1. Lumps Wastage
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {calculated.lumpsWastageKg.toFixed(2)}{" "}
                <span className="text-xs font-semibold text-slate-400">kg</span>
              </h3>
              <p className="text-xs font-bold text-sky-600 mt-1">
                {calculated.lumpsWastagePct}%{" "}
                <span className="text-[11px] font-normal text-slate-500">
                  of polymer used
                </span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
                2. Fabric Wastage
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {calculated.fabricWastageKg.toFixed(2)}{" "}
                <span className="text-xs font-semibold text-slate-400">kg</span>
              </h3>
              <p className="text-xs font-bold text-purple-600 mt-1">
                {calculated.fabricWastagePct}%{" "}
                <span className="text-[11px] font-normal text-slate-500">
                  of fabric rolled
                </span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Scale className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                Total Shift Wastage
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {calculated.totalWastageKg.toFixed(2)}{" "}
                <span className="text-xs font-semibold text-slate-400">kg</span>
              </h3>
              <p className="text-xs font-bold text-rose-600 mt-1">
                {calculated.totalWastagePct}%{" "}
                <span className="text-[11px] font-normal text-slate-500">
                  of total base ({calculated.totalBaseKg} kg)
                </span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Wastage Table */}
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-6 shadow-2xl overflow-hidden"
            : "bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
        }
      >
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 px-2 text-xs border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer active:scale-95"
              title={isFullscreen ? "Collapse back to normal view (Esc)" : "Expand table to fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-sky-600" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-sky-600" />
                  <span>Expand</span>
                </>
              )}
            </Button>
            <span className="h-2 w-2 rounded-full bg-sky-600"></span>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Shift Wastage Breakdown & Percentage Calculations
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Formulas: (Wastage kg ÷ Base Input kg) × 100
          </span>
        </div>

        <div className={isFullscreen ? "overflow-x-auto overflow-y-auto flex-1 border rounded-lg bg-card" : "overflow-x-auto"}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">S.No.</th>
                <th className="py-3 px-4 w-32">Wastage Type</th>
                <th className="py-3 px-4">Base Input Material (Source)</th>
                <th className="py-3 px-4 w-44 text-right">Base Qty (kg)</th>
                <th className="py-3 px-4 w-44 text-right">Wastage Qty (kg)</th>
                <th className="py-3 px-4 w-36 text-right">Wastage %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {/* ROW 1: LUMPS */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 text-center font-medium text-slate-500">1</td>
                <td className="py-3.5 px-4 font-bold text-sky-900">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                    Lumps
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  <div className="font-medium text-slate-900">
                    Raw Material Used (Manual Total)
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Sourced from Raw Material Entry Shift Total
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="relative inline-block w-36">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={rawMaterialUsedKg}
                      onChange={(e) => setRawMaterialUsedKg(e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-right font-bold text-xs pr-6 bg-white border-slate-200 focus-visible:ring-sky-500"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="relative inline-block w-36">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={lumpsWastageKg}
                      onChange={(e) => setLumpsWastageKg(e.target.value)}
                      placeholder="Enter kg"
                      className="h-8 text-right font-bold text-xs pr-6 bg-sky-50/40 border-sky-300 focus-visible:ring-sky-500 text-sky-950"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-sm text-sky-700">
                  {calculated.lumpsWastagePct}%
                </td>
              </tr>

              {/* ROW 2: FABRIC */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 text-center font-medium text-slate-500">2</td>
                <td className="py-3.5 px-4 font-bold text-purple-900">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                    Fabric
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  <div className="font-medium text-slate-900">
                    Production Sheet Total Net Weight
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Sourced from Production Report Unlaminated Roll Net Weight
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="relative inline-block w-36">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fabricNetWeightKg}
                      onChange={(e) => setFabricNetWeightKg(e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-right font-bold text-xs pr-6 bg-white border-slate-200 focus-visible:ring-purple-500"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="relative inline-block w-36">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fabricWastageKg}
                      onChange={(e) => setFabricWastageKg(e.target.value)}
                      placeholder="Enter kg"
                      className="h-8 text-right font-bold text-xs pr-6 bg-purple-50/40 border-purple-300 focus-visible:ring-purple-500 text-purple-950"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-sm text-purple-700">
                  {calculated.fabricWastagePct}%
                </td>
              </tr>
            </tbody>

            {/* TOTALS FOOTER */}
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                <td colSpan={3} className="py-3 px-4 text-center uppercase tracking-wider text-[11px]">
                  TOTAL SHIFT RECONCILIATION
                </td>
                <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm">
                  {calculated.totalBaseKg.toLocaleString(undefined, { minimumFractionDigits: 2 })} kg
                </td>
                <td className="py-3 px-4 text-right font-extrabold text-rose-700 text-sm">
                  {calculated.totalWastageKg.toLocaleString(undefined, { minimumFractionDigits: 2 })} kg
                </td>
                <td className="py-3 px-4 text-right font-extrabold text-rose-700 text-sm">
                  {calculated.totalWastagePct}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Printable Preview Modal */}
      <WastagePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportData={currentReportData}
      />
    </div>
  );
}
