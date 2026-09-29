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
import { ProductionSummaryPrintModal } from "./ProductionSummaryPrintModal";

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
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Aggregate shift performance, contractor volume, operator output, and quality metrics with export capabilities.
              </p>
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
            <span className="text-[10px] text-slate-400">recorded</span>
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
            <span className="text-[10px] text-slate-400">rolls laminated</span>
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
            <span className="text-[10px] text-slate-400">meters</span>
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
            <span className="text-[10px] text-slate-400">kg output</span>
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
            <span className="text-[10px] text-slate-400">kg unlaminated</span>
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
            <span className="text-[10px] text-slate-400">g/m average</span>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs: Contractor-wise, Operator-wise, Quality-wise */}
      <Tabs defaultValue="contractor" className="space-y-3">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="contractor" className="text-xs font-semibold">
            <Building className="h-3.5 w-3.5 mr-1.5" />
            Contractor-Wise
          </TabsTrigger>
          <TabsTrigger value="operator" className="text-xs font-semibold">
            <User className="h-3.5 w-3.5 mr-1.5" />
            Operator-Wise
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-xs font-semibold">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Quality-Wise
          </TabsTrigger>
          <TabsTrigger value="shifts" className="text-xs font-semibold">
            <Film className="h-3.5 w-3.5 mr-1.5" />
            Shift Log ({summaryData.reports.length})
          </TabsTrigger>
        </TabsList>

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
