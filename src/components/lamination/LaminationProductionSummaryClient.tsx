"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Building,
  User,
  Search,
  Printer,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Layers,
  Scale,
  Film,
  TrendingUp,
  BarChart3,
  Award,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { exportProductionSummaryExcel } from "@/lib/lamination/production-summary-export";
import dynamic from "next/dynamic";

const ProductionSummaryPrintModal = dynamic(
  () => import("./ProductionSummaryPrintModal").then((m) => m.ProductionSummaryPrintModal),
  { ssr: false }
);

const SHIFTS = ["ALL", "Day Shift", "Night Shift"];

export function LaminationProductionSummaryClient() {
  const [dateFrom, setDateFrom] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [shiftFilter, setShiftFilter] = useState<string>("ALL");
  const [contractorFilter, setContractorFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileSummaryTab, setMobileSummaryTab] = useState<"contractor" | "operator" | "quality" | "shifts">("contractor");

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<{
    overall: any;
    contractorSummary: any[];
    operatorSummary: any[];
    qualitySummary: any[];
    reports: any[];
  }>({
    overall: {
      totalShifts: 0,
      totalRolls: 0,
      totalProductionMtrs: 0,
      totalNetWtAfter: 0,
      totalRollMtrsBefore: 0,
      totalNetWtBefore: 0,
      avgCoating: 0,
    },
    contractorSummary: [],
    operatorSummary: [],
    qualitySummary: [],
    reports: [],
  });

  const [contractorsList, setContractorsList] = useState<any[]>([]);

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

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (shiftFilter && shiftFilter !== "ALL") params.set("shiftName", shiftFilter);
      if (contractorFilter && contractorFilter !== "ALL") params.set("contractorName", contractorFilter);

      const res = await fetch(`/api/production/lamination/summary?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setSummaryData(data);
      } else {
        toast.error(data.error || "Failed to load summary");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading production summary");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [dateFrom, dateTo, shiftFilter, contractorFilter]);

  const handleExportExcel = () => {
    exportProductionSummaryExcel(
      summaryData.overall,
      summaryData.contractorSummary,
      summaryData.operatorSummary,
      summaryData.qualitySummary,
      { from: dateFrom, to: dateTo }
    );
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                Production Summary & Analytics
              </h1>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            Excel Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 mr-1.5 text-sky-600" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Filter Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          {/* From Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
              From Date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
              To Date
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Shift Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Shift
            </label>
            <Select value={shiftFilter} onValueChange={(val) => { if (val) setShiftFilter(val); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Shifts" />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s === "ALL" ? "All Shifts" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contractor Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              Contractor
            </label>
            <Select value={contractorFilter} onValueChange={(val) => { if (val) setContractorFilter(val); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Contractors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Contractors</SelectItem>
                {contractorsList.map((c) => (
                  <SelectItem key={c.id} value={c.name} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Shifts
            </p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {summaryData.overall.totalShifts}
            </h3>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Rolls Processed
            </p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">
              {summaryData.overall.totalRolls}
            </h3>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">
              Production Meters
            </p>
            <h3 className="text-xl font-bold text-sky-800 mt-0.5">
              {summaryData.overall.totalProductionMtrs.toLocaleString()}
            </h3>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Laminated Net Wt
            </p>
            <h3 className="text-xl font-bold text-emerald-800 mt-0.5">
              {summaryData.overall.totalNetWtAfter.toLocaleString()}
            </h3>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
              Fabric Consumed
            </p>
            <h3 className="text-xl font-bold text-purple-800 mt-0.5">
              {summaryData.overall.totalNetWtBefore.toLocaleString()}
            </h3>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Avg Coating Wt
            </p>
            <h3 className="text-xl font-bold text-amber-800 mt-0.5">
              {summaryData.overall.avgCoating}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW: Multi-Tab Wide Tables (100% Preserved)                      */}
      {/* ========================================================================= */}
      <div className="hidden md:block">
        <div
          className={
            isFullscreen
              ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-6 shadow-2xl overflow-y-auto"
              : "space-y-3"
          }
        >
          <Tabs defaultValue="contractor" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8.5 px-2.5 text-xs border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title={isFullscreen ? "Collapse back to normal view (Esc)" : "Expand summary to fullscreen"}
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
              </div>
              <TabsList className="bg-slate-100 p-1 border border-slate-200">
                <TabsTrigger value="contractor" className="text-xs font-semibold cursor-pointer">
                  <Building className="h-3.5 w-3.5 mr-1.5" />
                  Contractor-Wise
                </TabsTrigger>
                <TabsTrigger value="operator" className="text-xs font-semibold cursor-pointer">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  Operator-Wise
                </TabsTrigger>
                <TabsTrigger value="quality" className="text-xs font-semibold cursor-pointer">
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Quality-Wise
                </TabsTrigger>
                <TabsTrigger value="shifts" className="text-xs font-semibold cursor-pointer">
                  <Film className="h-3.5 w-3.5 mr-1.5" />
                  Shift Log ({summaryData.reports.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 1. CONTRACTOR-WISE TAB */}
            <TabsContent value="contractor" className="space-y-3">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Contractor Production Breakdown
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {summaryData.contractorSummary.length} contractors
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Contractor Name</th>
                        <th className="py-2.5 px-3 text-center w-24">Shifts</th>
                        <th className="py-2.5 px-3 text-center w-24">Rolls</th>
                        <th className="py-2.5 px-3 text-right w-36">Production (Mtrs)</th>
                        <th className="py-2.5 px-3 text-right w-36">Output Wt (kg)</th>
                        <th className="py-2.5 px-3 text-right w-32">Avg Coating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summaryData.contractorSummary.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No contractor records found for selected period.
                          </td>
                        </tr>
                      ) : (
                        summaryData.contractorSummary.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {c.contractorName}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">
                              {c.shiftCount}
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                              {c.rollCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-sky-800">
                              {c.productionMtrs.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                              {c.netWtAfter.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                              {c.avgCoating} g/m
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* 2. OPERATOR-WISE TAB */}
            <TabsContent value="operator" className="space-y-3">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Operator Production Performance
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {summaryData.operatorSummary.length} operators
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Operator Name</th>
                        <th className="py-2.5 px-3 text-center w-24">Shifts</th>
                        <th className="py-2.5 px-3 text-center w-24">Rolls</th>
                        <th className="py-2.5 px-3 text-right w-36">Production (Mtrs)</th>
                        <th className="py-2.5 px-3 text-right w-36">Output Wt (kg)</th>
                        <th className="py-2.5 px-3 text-right w-32">Avg Coating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summaryData.operatorSummary.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No operator records found.
                          </td>
                        </tr>
                      ) : (
                        summaryData.operatorSummary.map((op, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {op.operatorName}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">
                              {op.shiftCount}
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                              {op.rollCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-sky-800">
                              {op.productionMtrs.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                              {op.netWtAfter.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                              {op.avgCoating} g/m
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* 3. QUALITY-WISE TAB */}
            <TabsContent value="quality" className="space-y-3">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Quality & Size Distribution
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {summaryData.qualitySummary.length} qualities
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Quality</th>
                        <th className="py-2.5 px-3 text-center w-28">Width / Size</th>
                        <th className="py-2.5 px-3 text-center w-24">Rolls</th>
                        <th className="py-2.5 px-3 text-right w-36">Production (Mtrs)</th>
                        <th className="py-2.5 px-3 text-right w-36">Output Wt (kg)</th>
                        <th className="py-2.5 px-3 text-right w-32">Avg Coating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summaryData.qualitySummary.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No quality data available.
                          </td>
                        </tr>
                      ) : (
                        summaryData.qualitySummary.map((q, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {q.quality}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                              {q.size || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                              {q.rollCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-sky-800">
                              {q.productionMtrs.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                              {q.netWtAfter.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                              {q.avgCoating} g/m
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* 4. SHIFT LOG TAB */}
            <TabsContent value="shifts" className="space-y-3">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Shift Production Runs
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {summaryData.reports.length} shifts
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Shift</th>
                        <th className="py-2.5 px-3">Operator</th>
                        <th className="py-2.5 px-3">Contractor</th>
                        <th className="py-2.5 px-3 text-center">Rolls</th>
                        <th className="py-2.5 px-3 text-right">Production (Mtrs)</th>
                        <th className="py-2.5 px-3 text-right">Output Wt (kg)</th>
                        <th className="py-2.5 px-3 text-right">Coating</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summaryData.reports.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No shift reports found.
                          </td>
                        </tr>
                      ) : (
                        summaryData.reports.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {r.date}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{r.shiftName}</td>
                            <td className="py-2.5 px-3 text-slate-700">{r.operatorName || "—"}</td>
                            <td className="py-2.5 px-3 text-slate-700">{r.contractorName || "—"}</td>
                            <td className="py-2.5 px-3 text-center">{r.entries?.length || 0}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-sky-800">
                              {r.totalProductionMtrs.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                              {r.totalNetWtAfter.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                              {r.avgCoating} g/m
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  r.status === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : r.status === "SUBMITTED"
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {r.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW: Segmented Breakdown Touch Cards                              */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4">
        {/* Mobile Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setMobileSummaryTab("contractor")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center whitespace-nowrap transition-all ${
              mobileSummaryTab === "contractor"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "hover:text-slate-900"
            }`}
          >
            Contractor
          </button>
          <button
            type="button"
            onClick={() => setMobileSummaryTab("operator")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center whitespace-nowrap transition-all ${
              mobileSummaryTab === "operator"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "hover:text-slate-900"
            }`}
          >
            Operator
          </button>
          <button
            type="button"
            onClick={() => setMobileSummaryTab("quality")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center whitespace-nowrap transition-all ${
              mobileSummaryTab === "quality"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "hover:text-slate-900"
            }`}
          >
            Quality
          </button>
          <button
            type="button"
            onClick={() => setMobileSummaryTab("shifts")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-center whitespace-nowrap transition-all ${
              mobileSummaryTab === "shifts"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "hover:text-slate-900"
            }`}
          >
            Shifts ({summaryData.reports.length})
          </button>
        </div>

        {/* Tab 1: Contractor Mobile Cards */}
        {mobileSummaryTab === "contractor" && (
          <div className="space-y-2.5">
            {summaryData.contractorSummary.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No contractor records found.
              </div>
            ) : (
              summaryData.contractorSummary.map((c, idx) => (
                <Card key={idx} className="border-slate-200 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <h4 className="font-bold text-xs text-slate-900">{c.contractorName}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                        {c.shiftCount} shifts
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                        {c.rollCount} rolls
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
                        <span className="text-[9px] uppercase font-bold text-sky-700 block">Production</span>
                        <span className="text-xs font-extrabold text-sky-950">
                          {c.productionMtrs.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">m</span>
                        </span>
                      </div>
                      <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                        <span className="text-[9px] uppercase font-bold text-emerald-700 block">Output Wt</span>
                        <span className="text-xs font-extrabold text-emerald-950">
                          {c.netWtAfter.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">kg</span>
                        </span>
                      </div>
                      <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        <span className="text-[9px] uppercase font-bold text-amber-700 block">Avg Coating</span>
                        <span className="text-xs font-extrabold text-amber-950">
                          {c.avgCoating} <span className="text-[9px] font-normal text-slate-500">g/m</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Operator Mobile Cards */}
        {mobileSummaryTab === "operator" && (
          <div className="space-y-2.5">
            {summaryData.operatorSummary.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No operator records found.
              </div>
            ) : (
              summaryData.operatorSummary.map((op, idx) => (
                <Card key={idx} className="border-slate-200 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <h4 className="font-bold text-xs text-slate-900">{op.operatorName}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                        {op.shiftCount} shifts
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                        {op.rollCount} rolls
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
                        <span className="text-[9px] uppercase font-bold text-sky-700 block">Production</span>
                        <span className="text-xs font-extrabold text-sky-950">
                          {op.productionMtrs.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">m</span>
                        </span>
                      </div>
                      <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                        <span className="text-[9px] uppercase font-bold text-emerald-700 block">Output Wt</span>
                        <span className="text-xs font-extrabold text-emerald-950">
                          {op.netWtAfter.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">kg</span>
                        </span>
                      </div>
                      <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        <span className="text-[9px] uppercase font-bold text-amber-700 block">Avg Coating</span>
                        <span className="text-xs font-extrabold text-amber-950">
                          {op.avgCoating} <span className="text-[9px] font-normal text-slate-500">g/m</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Quality Mobile Cards */}
        {mobileSummaryTab === "quality" && (
          <div className="space-y-2.5">
            {summaryData.qualitySummary.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No quality records found.
              </div>
            ) : (
              summaryData.qualitySummary.map((q, idx) => (
                <Card key={idx} className="border-slate-200 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      <h4 className="font-bold text-xs text-slate-900">{q.quality}</h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono text-purple-700 border-purple-200 bg-purple-50/50">
                      Size: {q.size || "Standard"}
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Rolls</span>
                        <span className="text-xs font-extrabold text-slate-800">{q.rollCount}</span>
                      </div>
                      <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
                        <span className="text-[9px] uppercase font-bold text-sky-700 block">Production</span>
                        <span className="text-xs font-extrabold text-sky-950">
                          {q.productionMtrs.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">m</span>
                        </span>
                      </div>
                      <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                        <span className="text-[9px] uppercase font-bold text-emerald-700 block">Output Wt</span>
                        <span className="text-xs font-extrabold text-emerald-950">
                          {q.netWtAfter.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">kg</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Shift Log Mobile Cards */}
        {mobileSummaryTab === "shifts" && (
          <div className="space-y-2.5">
            {summaryData.reports.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                No shift reports found.
              </div>
            ) : (
              summaryData.reports.map((r, idx) => (
                <Card key={idx} className="border-slate-200 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{r.date}</span>
                      <span className="text-[10px] text-slate-500">{r.shiftName}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        r.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : r.status === "SUBMITTED"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Operator: <strong className="text-slate-800">{r.operatorName || "—"}</strong></span>
                      <span>Contractor: <strong className="text-slate-800">{r.contractorName || "—"}</strong></span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Rolls</span>
                        <span className="text-xs font-extrabold text-slate-900">{r.entries?.length || 0}</span>
                      </div>
                      <div className="bg-sky-50/50 p-1.5 rounded-lg border border-sky-100">
                        <span className="text-[9px] uppercase font-bold text-sky-700 block">Meters</span>
                        <span className="text-xs font-extrabold text-sky-950">{r.totalProductionMtrs.toLocaleString()}</span>
                      </div>
                      <div className="bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100">
                        <span className="text-[9px] uppercase font-bold text-emerald-700 block">Output Wt</span>
                        <span className="text-xs font-extrabold text-emerald-950">{r.totalNetWtAfter.toLocaleString()} kg</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <ProductionSummaryPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={{
          overall: summaryData.overall,
          contractorSummary: summaryData.contractorSummary,
          operatorSummary: summaryData.operatorSummary,
          qualitySummary: summaryData.qualitySummary,
          filters: {
            dateFrom,
            dateTo,
            shiftFilter,
            contractorFilter,
          },
        }}
      />
    </div>
  );
}
