"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Package,
  Boxes,
  Scale,
  Layers,
  Printer,
  Plus,
  RefreshCw,
  Search,
  Calendar,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  FileText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { RecipeQualityBadge } from "./RecipeQualityBadge";
import { BobbinIssueModal } from "./BobbinIssueModal";
import { BobbinIssueSlipModal } from "./BobbinIssueSlipModal";
import { BobbinInwardSlipModal } from "./BobbinInwardSlipModal";
import { BobbinIssueSlipData } from "@/lib/tape-plant/print-bobbin-issue-slip";
import { BobbinInwardSlipData } from "@/lib/tape-plant/print-bobbin-inward-slip";
import { BOBBIN_WEIGHT_KG, CRATE_WEIGHT_KG } from "@/lib/tape-plant/bobbin-stock";

interface BobbinIssueItem {
  slNo: number;
  id: string;
  slipNumber: string;
  date: string;
  shiftId: string;
  shiftName: string;
  recipeQuality: string;
  loomNumber?: number | null;
  loomIdentifier?: string | null;
  loomAllocations?: any;
  crateCount: number;
  bobbinCount: number;
  weightKg: number;
  issuedBy?: string;
  receivedBy?: string;
  remarks?: string;
  status: string;
  createdAt: string;
}

interface BobbinTransactionItem {
  id: string;
  type: "INWARD" | "OUTWARD";
  date: string;
  shiftId: string;
  shiftName: string;
  recipeQuality: string;
  referenceNo: string;
  loomNumber?: number | null;
  loomIdentifier?: string | null;
  grossKg?: number;
  wasteKg?: number;
  netKg: number;
  bobbins: number;
  crates: number;
  operator?: string;
  receiver?: string;
  remarks?: string;
  createdAt: string;
}

interface StockQualityOption {
  recipeQuality: string;
  availableCrates: number;
  availableBobbins: number;
  availableKg: number;
}

export interface BobbinIssueSectionProps {
  onNavigateToBobbinStock?: () => void;
}

export function BobbinIssueSection({ onNavigateToBobbinStock }: BobbinIssueSectionProps = {}) {
  const [activeSubTab, setActiveSubTab] = useState<"issues" | "ledger">("issues");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "single" | "range">("all");
  const [selectedSingleDate, setSelectedSingleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<{ id: string; name: string }[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("ALL");
  const [selectedLoom, setSelectedLoom] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<"ALL" | "INWARD" | "OUTWARD">("ALL");

  // Data
  const [issues, setIssues] = useState<BobbinIssueItem[]>([]);
  const [issueTotals, setIssueTotals] = useState({
    totalIssuesCount: 0,
    totalCratesIssued: 0,
    totalBobbinsIssued: 0,
    totalWeightIssuedKg: 0,
    uniqueLoomsCount: 0,
    uniqueQualitiesCount: 0,
  });

  const [transactions, setTransactions] = useState<BobbinTransactionItem[]>([]);
  const [ledgerTotals, setLedgerTotals] = useState({
    inward: { totalKg: 0, totalBobbins: 0, totalCrates: 0 },
    outward: { totalKg: 0, totalBobbins: 0, totalCrates: 0 },
    balance: { netKg: 0, bobbins: 0, crates: 0 },
  });

  const [availableStockOptions, setAvailableStockOptions] = useState<StockQualityOption[]>([]);

  // Modals state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedIssueSlip, setSelectedIssueSlip] = useState<BobbinIssueSlipData | null>(null);
  const [issueSlipModalOpen, setIssueSlipModalOpen] = useState(false);
  const [selectedInwardSlip, setSelectedInwardSlip] = useState<BobbinInwardSlipData | null>(null);
  const [inwardSlipModalOpen, setInwardSlipModalOpen] = useState(false);

  // Fetch shifts
  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setShifts(data);
      })
      .catch(() => {});
  }, []);

  // Fetch Available Stock from Bobbin Stock API
  const fetchAvailableStock = useCallback(async () => {
    try {
      const res = await fetch("/api/production/tape-plant/bobbin-stock?scope=all");
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        const options: StockQualityOption[] = items.map((i: any) => ({
          recipeQuality: i.recipeQuality,
          availableCrates: i.crateStock || 0,
          availableBobbins: i.bobbinStock || 0,
          availableKg: i.netProductionKg - (i.issuedKg || 0),
        }));
        setAvailableStockOptions(options);
      }
    } catch {}
  }, []);

  // Fetch Issues Data
  const fetchIssuesData = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("scope", dateFilterMode === "all" ? "all" : dateFilterMode);
        if (dateFilterMode === "single" && selectedSingleDate) params.set("date", selectedSingleDate);
        else if (dateFilterMode === "range") {
          if (dateFrom) params.set("dateFrom", dateFrom);
          if (dateTo) params.set("dateTo", dateTo);
        }

        if (selectedShiftId && selectedShiftId.toUpperCase() !== "ALL") {
          params.set("shiftId", selectedShiftId);
        }

        if (selectedLoom && selectedLoom !== "ALL") {
          params.set("loomNumber", selectedLoom);
        }

        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }

        const res = await fetch(`/api/production/tape-plant/bobbin-issue?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load issues");
        const data = await res.json();
        setIssues(Array.isArray(data.issues) ? data.issues : []);
        if (data.totals) setIssueTotals(data.totals);
      } catch (err) {
        console.error("Error loading bobbin issues:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateFilterMode, selectedSingleDate, dateFrom, dateTo, selectedShiftId, selectedLoom, searchTerm]
  );

  // Fetch Ledger Transactions Data
  const fetchLedgerData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilterMode === "single" && selectedSingleDate) params.set("date", selectedSingleDate);
      else if (dateFilterMode === "range") {
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
      }

      if (selectedShiftId && selectedShiftId.toUpperCase() !== "ALL") {
        params.set("shiftId", selectedShiftId);
      }

      if (selectedLoom && selectedLoom !== "ALL") {
        params.set("loomNumber", selectedLoom);
      }

      if (transactionTypeFilter !== "ALL") {
        params.set("type", transactionTypeFilter);
      }

      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }

      const res = await fetch(`/api/production/tape-plant/bobbin-transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        if (data.totals) setLedgerTotals(data.totals);
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  }, [dateFilterMode, selectedSingleDate, dateFrom, dateTo, selectedShiftId, selectedLoom, transactionTypeFilter, searchTerm]);

  // Load everything
  useEffect(() => {
    fetchIssuesData();
    fetchLedgerData();
    fetchAvailableStock();
  }, [fetchIssuesData, fetchLedgerData, fetchAvailableStock]);

  const handleIssueSuccess = (issueData: BobbinIssueSlipData) => {
    setSelectedIssueSlip(issueData);
    setIssueSlipModalOpen(true);
    fetchIssuesData(true);
    fetchLedgerData();
    fetchAvailableStock();
  };

  const handlePrintExistingIssueSlip = (item: BobbinIssueItem) => {
    setSelectedIssueSlip({
      slipNumber: item.slipNumber,
      date: item.date,
      shiftName: item.shiftName,
      recipeQuality: item.recipeQuality,
      loomNumber: item.loomNumber,
      loomIdentifier: item.loomIdentifier,
      allocations: item.loomAllocations || (item as any).allocations || null,
      crateCount: item.crateCount,
      bobbinCount: item.bobbinCount,
      weightKg: item.weightKg,
      issuedBy: item.issuedBy,
      receivedBy: item.receivedBy,
      remarks: item.remarks,
    });
    setIssueSlipModalOpen(true);
  };

  const handlePrintInwardSlip = (tx: BobbinTransactionItem) => {
    setSelectedInwardSlip({
      referenceNo: tx.referenceNo,
      date: tx.date,
      shiftName: tx.shiftName,
      recipeQuality: tx.recipeQuality,
      grossKg: tx.grossKg || tx.netKg,
      wasteKg: tx.wasteKg || 0,
      netKg: tx.netKg,
      bobbins: tx.bobbins,
      crates: tx.crates,
      operatorName: tx.operator,
      remarks: tx.remarks,
    });
    setInwardSlipModalOpen(true);
  };

  const handleCancelIssue = async (id: string, slipNumber: string) => {
    if (!confirm(`Are you sure you want to cancel issue slip ${slipNumber}? This will return stock to inventory.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/production/tape-plant/bobbin-issue?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to cancel issue");
      toast.success(`Slip ${slipNumber} cancelled and stock restored`);
      fetchIssuesData(true);
      fetchLedgerData();
      fetchAvailableStock();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel");
    }
  };

  const handleResetFilters = () => {
    setDateFilterMode("all");
    setSelectedShiftId("ALL");
    setSelectedLoom("ALL");
    setSearchTerm("");
    setTransactionTypeFilter("ALL");
    toast.info("Reset filters to default");
  };

  const isFilterActive =
    dateFilterMode !== "all" ||
    selectedShiftId !== "ALL" ||
    selectedLoom !== "ALL" ||
    searchTerm !== "" ||
    transactionTypeFilter !== "ALL";

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full">
      {/* Minimalist Bento Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Crates Issued */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Crates Issued
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${issueTotals.totalCratesIssued.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })} crates`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              8 bobbins (12.8 kg) per crate
            </p>
          </div>
        </div>

        {/* Total Bobbins Issued */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Bobbins Issued
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${issueTotals.totalBobbinsIssued.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })} pcs`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Standard 1.6 kg per bobbin
            </p>
          </div>
        </div>

        {/* Total Weight Issued (KG) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Weight Issued
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${issueTotals.totalWeightIssuedKg.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Deducted live from Bobbin Stock
            </p>
          </div>
        </div>

        {/* Active Looms Fed */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Looms Fed / Dispatches
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${issueTotals.uniqueLoomsCount} Looms`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {issueTotals.totalIssuesCount} slips across {issueTotals.uniqueQualitiesCount} qualities
            </p>
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Header & Sub-tab Switcher */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Sleek Subtab Pill Control */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("issues")}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeSubTab === "issues"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Loom Issues (Outward)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("ledger")}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    activeSubTab === "ledger"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Full Ledger (IN / OUT)
                </button>
              </div>

              {onNavigateToBobbinStock && (
                <button
                  type="button"
                  onClick={onNavigateToBobbinStock}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors hidden md:inline"
                >
                  Bobbin Stock Summary &rarr;
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fetchIssuesData(true);
                  fetchLedgerData();
                  fetchAvailableStock();
                }}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-slate-700" : "text-slate-500"}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIssueModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Issue to Loom</span>
              </button>
            </div>
          </div>

          {/* Minimalist Filter Strip */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Scope Pills */}
              <div className="inline-flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDateFilterMode("all")}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    dateFilterMode === "all" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600"
                  }`}
                >
                  All (Till Today)
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("single")}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    dateFilterMode === "single" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600"
                  }`}
                >
                  Single Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("range")}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    dateFilterMode === "range" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600"
                  }`}
                >
                  Range
                </button>
              </div>

              {/* Conditional Date Pickers */}
              {dateFilterMode === "single" && (
                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <input
                    type="date"
                    value={selectedSingleDate}
                    onChange={(e) => setSelectedSingleDate(e.target.value)}
                    className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              )}

              {dateFilterMode === "range" && (
                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                  <span className="text-slate-400 text-[10px]">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              )}

              {/* Shift Filter */}
              <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs">
                <Clock className="h-3 w-3 text-slate-400" />
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                >
                  <option value="ALL">All Shifts</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loom Filter */}
              <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs">
                <span className="text-[10px] text-slate-400 uppercase">Loom:</span>
                <select
                  value={selectedLoom}
                  onChange={(e) => setSelectedLoom(e.target.value)}
                  className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                >
                  <option value="ALL">All Looms</option>
                  {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      Loom #{num}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ledger Type Filter */}
              {activeSubTab === "ledger" && (
                <div className="inline-flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setTransactionTypeFilter("ALL")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      transactionTypeFilter === "ALL" ? "bg-white text-slate-900 font-semibold shadow-2xs" : "text-slate-600"
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionTypeFilter("INWARD")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      transactionTypeFilter === "INWARD" ? "bg-slate-900 text-white font-medium" : "text-slate-600"
                    }`}
                  >
                    IN Receipts
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionTypeFilter("OUTWARD")}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      transactionTypeFilter === "OUTWARD" ? "bg-slate-900 text-white font-medium" : "text-slate-600"
                    }`}
                  >
                    OUT Issues
                  </button>
                </div>
              )}

              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search slip, quality, loom..."
                className="w-full pl-8 pr-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Tab View 1: Outgoing Bobbin Issues */}
        {activeSubTab === "issues" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Slip Ref</th>
                  <th className="py-2.5 px-3">Date & Shift</th>
                  <th className="py-2.5 px-3">Quality Name</th>
                  <th className="py-2.5 px-3">Loom Target</th>
                  <th className="py-2.5 px-3 text-right">Crates</th>
                  <th className="py-2.5 px-3 text-right">Bobbins</th>
                  <th className="py-2.5 px-3 text-right">Weight</th>
                  <th className="py-2.5 px-3">Issuer / Receiver</th>
                  <th className="py-2.5 px-3 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-600" />
                        <span>Loading issue records...</span>
                      </div>
                    </td>
                  </tr>
                ) : issues.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center p-4">
                        <div className="p-3 bg-slate-100 text-slate-400 rounded-xl mb-2.5">
                          <Package className="h-6 w-6" />
                        </div>
                        <h3 className="text-xs font-semibold text-slate-800">No Bobbin Issues Recorded</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 text-center">
                          {searchTerm
                            ? `No records matching "${searchTerm}".`
                            : "No crates have been issued for the selected filter scope."}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIssueModalOpen(true)}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Issue Bobbins to Loom</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  issues.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{item.slNo}</td>

                      <td className="py-2.5 px-3 font-mono text-slate-900 font-semibold text-[11px]">
                        {item.slipNumber}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900">{item.date}</div>
                        <div className="text-[10px] text-slate-400">{item.shiftName}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <RecipeQualityBadge value={item.recipeQuality} />
                      </td>

                      <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                        {item.loomIdentifier || (item.loomNumber ? `Loom #${item.loomNumber}` : "Loom Shed")}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {item.crateCount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-normal text-slate-400">crates</span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {item.bobbinCount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-normal text-slate-400">pcs</span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {item.weightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-normal text-slate-400">kg</span>
                      </td>

                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        <div>By: <span className="font-medium text-slate-800">{item.issuedBy || "—"}</span></div>
                        <div>To: <span className="text-slate-500">{item.receivedBy || "—"}</span></div>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handlePrintExistingIssueSlip(item)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Print / View Issue Slip"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelIssue(item.id, item.slipNumber)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Cancel Issue"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {issues.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/90 border-t border-slate-200 font-semibold text-xs text-slate-900">
                    <td colSpan={5} className="py-2.5 px-3 text-right text-slate-500 text-[11px] uppercase tracking-wider">
                      Total Issued:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {issueTotals.totalCratesIssued.toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-normal text-slate-500">crates</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {issueTotals.totalBobbinsIssued.toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-normal text-slate-500">pcs</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {issueTotals.totalWeightIssuedKg.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-normal text-slate-500">kg</span>
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-[11px] text-slate-400 font-normal">
                      {issues.length} total dispatches
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Tab View 2: Consolidated Transactions Ledger */}
        {activeSubTab === "ledger" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-20">Type</th>
                  <th className="py-2.5 px-3">Ref Number</th>
                  <th className="py-2.5 px-3">Date & Shift</th>
                  <th className="py-2.5 px-3">Quality</th>
                  <th className="py-2.5 px-3">Movement / Target</th>
                  <th className="py-2.5 px-3 text-right">Net KG</th>
                  <th className="py-2.5 px-3 text-right">Bobbins</th>
                  <th className="py-2.5 px-3 text-right">Crates</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3 text-center w-20">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 italic text-[11px]">
                      No stock movement transactions recorded for the selected scope.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isInward = tx.type === "INWARD";
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          {isInward ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                              <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
                              <span>IN</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200/80">
                              <ArrowUpRight className="h-3 w-3 text-slate-600" />
                              <span>OUT</span>
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800 text-[11px]">
                          {tx.referenceNo}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900">{tx.date}</div>
                          <div className="text-[10px] text-slate-400">{tx.shiftName}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <RecipeQualityBadge value={tx.recipeQuality} />
                        </td>

                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {isInward ? (
                            <span>Post-Production Output</span>
                          ) : (
                            <span className="font-mono text-slate-800">
                              {tx.loomIdentifier || (tx.loomNumber ? `Loom #${tx.loomNumber}` : "Loom Shed")}
                            </span>
                          )}
                        </td>

                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold ${
                            isInward ? "text-emerald-700" : "text-slate-800"
                          }`}
                        >
                          {isInward ? "+" : "−"}
                          {tx.netKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                          <span className="text-[10px] font-normal text-slate-400">kg</span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {isInward ? "+" : "−"}
                          {tx.bobbins.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                          <span className="text-[10px] font-normal text-slate-400">pcs</span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {isInward ? "+" : "−"}
                          {tx.crates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                          <span className="text-[10px] font-normal text-slate-400">crates</span>
                        </td>

                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {tx.operator || "—"}
                          {tx.receiver && <span className="text-slate-400 block text-[10px]">To: {tx.receiver}</span>}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {isInward ? (
                            <button
                              type="button"
                              onClick={() => handlePrintInwardSlip(tx)}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Print Inward Slip"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIssueSlip({
                                  slipNumber: tx.referenceNo,
                                  date: tx.date,
                                  shiftName: tx.shiftName,
                                  recipeQuality: tx.recipeQuality,
                                  loomNumber: tx.loomNumber,
                                  loomIdentifier: tx.loomIdentifier,
                                  crateCount: tx.crates,
                                  bobbinCount: tx.bobbins,
                                  weightKg: tx.netKg,
                                  issuedBy: tx.operator,
                                  receivedBy: tx.receiver,
                                  remarks: tx.remarks,
                                });
                                setIssueSlipModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Print Issue Slip"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <BobbinIssueModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        onSuccess={handleIssueSuccess}
        defaultDate={selectedSingleDate}
        defaultShiftId={selectedShiftId !== "ALL" ? selectedShiftId : undefined}
        availableStock={availableStockOptions}
      />

      <BobbinIssueSlipModal
        open={issueSlipModalOpen}
        onClose={() => setIssueSlipModalOpen(false)}
        data={selectedIssueSlip}
      />

      <BobbinInwardSlipModal
        open={inwardSlipModalOpen}
        onClose={() => setInwardSlipModalOpen(false)}
        data={selectedInwardSlip}
      />
    </div>
  );
}
