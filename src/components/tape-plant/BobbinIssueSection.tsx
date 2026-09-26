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
  Sparkles,
  ChevronRight,
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
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Bento Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Crates Issued */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
              Total Crates Issued
            </span>
            <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-purple-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${issueTotals.totalCratesIssued.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })} crates`
              )}
            </div>
            <p className="text-[11px] font-medium text-purple-700/80 mt-1">
              Standard 8 bobbins (12.8 kg) per crate
            </p>
          </div>
        </div>

        {/* Total Bobbins Issued */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Total Bobbins Issued
            </span>
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-blue-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${issueTotals.totalBobbinsIssued.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })} pcs`
              )}
            </div>
            <p className="text-[11px] font-medium text-blue-700/80 mt-1">
              Auto-calculated at 1.6 kg per bobbin
            </p>
          </div>
        </div>

        {/* Total Weight Issued (KG) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Total Weight Issued
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${issueTotals.totalWeightIssuedKg.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Deducted live from Tape Plant Stock
            </p>
          </div>
        </div>

        {/* Active Looms Fed */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Looms Fed / Dispatches
            </span>
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${issueTotals.uniqueLoomsCount} Looms (${issueTotals.totalIssuesCount} Slips)`
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Across {issueTotals.uniqueQualitiesCount} Recipe Qualities
            </p>
          </div>
        </div>
      </div>

      {/* Main Container Card with Sub-tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header & Sub-tab Switcher */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-900">
                  {activeSubTab === "issues" ? "Bobbin Loom Issue Register" : "Stock Transactions Ledger"}
                </h2>
                <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("issues")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      activeSubTab === "issues"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Loom Issues (Outward)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("ledger")}
                    className={`px-3 py-1 rounded-md transition-all ${
                      activeSubTab === "ledger"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Full Ledger (IN / OUT)
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeSubTab === "issues"
                  ? "Issue bobbin crates to circular looms with auto-calculated KG and print official issue slips."
                  : "Consolidated transaction history of Tape Plant receipts (IN) and Loom issues (OUT) with running balances."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={() => {
                  fetchIssuesData(true);
                  fetchLedgerData();
                  fetchAvailableStock();
                }}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-sm transition-colors cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : "text-slate-500"}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIssueModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Issue to Loom</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Scope Pills */}
              <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDateFilterMode("all")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    dateFilterMode === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600"
                  }`}
                >
                  All (Till Today)
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("single")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    dateFilterMode === "single" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600"
                  }`}
                >
                  Single Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("range")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    dateFilterMode === "range" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600"
                  }`}
                >
                  Date Range
                </button>
              </div>

              {/* Conditional Date Pickers */}
              {dateFilterMode === "single" && (
                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2.5 py-1 shadow-xs">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={selectedSingleDate}
                    onChange={(e) => setSelectedSingleDate(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              )}

              {dateFilterMode === "range" && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2.5 py-1 shadow-xs">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 font-semibold">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              )}

              {/* Shift Filter */}
              <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2.5 py-1 shadow-xs">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
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
              <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2.5 py-1 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Loom:</span>
                <select
                  value={selectedLoom}
                  onChange={(e) => setSelectedLoom(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                >
                  <option value="ALL">All Looms</option>
                  {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      Loom #{num}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ledger Type Filter if in Ledger tab */}
              {activeSubTab === "ledger" && (
                <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTransactionTypeFilter("ALL")}
                    className={`px-2.5 py-0.5 rounded-md ${
                      transactionTypeFilter === "ALL" ? "bg-white text-slate-900 font-bold" : "text-slate-600"
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionTypeFilter("INWARD")}
                    className={`px-2.5 py-0.5 rounded-md ${
                      transactionTypeFilter === "INWARD" ? "bg-emerald-600 text-white font-bold" : "text-slate-600"
                    }`}
                  >
                    IN (+ Receipts)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionTypeFilter("OUTWARD")}
                    className={`px-2.5 py-0.5 rounded-md ${
                      transactionTypeFilter === "OUTWARD" ? "bg-purple-600 text-white font-bold" : "text-slate-600"
                    }`}
                  >
                    OUT (- Issues)
                  </button>
                </div>
              )}

              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Live Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search slip, quality, loom, operator..."
                className="w-full pl-8 pr-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Tab View 1: Outgoing Bobbin Issues */}
        {activeSubTab === "issues" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Slip Ref</th>
                  <th className="py-3 px-4">Date & Shift</th>
                  <th className="py-3 px-4">Quality Name</th>
                  <th className="py-3 px-4">Destination Loom</th>
                  <th className="py-3 px-4 text-right bg-purple-50/60 text-purple-900 border-x border-purple-100">
                    Crates Issued
                  </th>
                  <th className="py-3 px-4 text-right bg-blue-50/60 text-blue-900 border-r border-blue-100">
                    Bobbins (@ 8)
                  </th>
                  <th className="py-3 px-4 text-right bg-emerald-50/60 text-emerald-900 border-r border-emerald-100">
                    Weight (KG)
                  </th>
                  <th className="py-3 px-4">Issuer / Receiver</th>
                  <th className="py-3 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                        <span>Loading issue records...</span>
                      </div>
                    </td>
                  </tr>
                ) : issues.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center p-4">
                        <div className="p-3 bg-slate-100 text-slate-400 rounded-full mb-3">
                          <Package className="h-8 w-8" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">No Bobbin Issues Found</h3>
                        <p className="text-xs text-slate-500 mt-1 text-center">
                          {searchTerm
                            ? `No records matching "${searchTerm}".`
                            : "No crates have been issued for the selected period."}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIssueModalOpen(true)}
                          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Issue Bobbins to Loom</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  issues.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4 text-center font-bold text-slate-500">{item.slNo}</td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          {item.slipNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.date}</div>
                        <div className="text-[10px] text-slate-500 uppercase">{item.shiftName}</div>
                      </td>

                      <td className="py-3 px-4">
                        <RecipeQualityBadge value={item.recipeQuality} />
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {item.loomIdentifier || (item.loomNumber ? `Loom #${item.loomNumber}` : "Loom Shed")}
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-purple-900 bg-purple-50/30 border-x border-purple-100/70">
                        {item.crateCount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-semibold text-purple-600">crates</span>
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-blue-900 bg-blue-50/30 border-r border-blue-100/70">
                        {item.bobbinCount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-semibold text-blue-600">pcs</span>
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-emerald-900 bg-emerald-50/30 border-r border-emerald-100/70">
                        {item.weightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-semibold text-emerald-600">kg</span>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>By: <strong className="text-slate-800">{item.issuedBy || "—"}</strong></div>
                        <div>To: <span className="text-slate-500">{item.receivedBy || "—"}</span></div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintExistingIssueSlip(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Print / View Issue Slip"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelIssue(item.id, item.slipNumber)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Cancel Issue and Return Stock"
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
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-xs text-slate-900">
                    <td colSpan={5} className="py-3.5 px-4 text-right uppercase tracking-wider">
                      Total Dispatched:
                    </td>
                    <td className="py-3.5 px-4 text-right text-purple-900 bg-purple-100 border-x border-purple-200">
                      {issueTotals.totalCratesIssued.toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-bold">crates</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-blue-900 bg-blue-100 border-r border-blue-200">
                      {issueTotals.totalBobbinsIssued.toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-bold">pcs</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-900 bg-emerald-100 border-r border-emerald-200">
                      {issueTotals.totalWeightIssuedKg.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-bold">kg</span>
                    </td>
                    <td colSpan={2} className="py-3.5 px-4 text-xs text-slate-500 font-normal">
                      {issues.length} total issue slips
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
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4 w-24">Type</th>
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Date & Shift</th>
                  <th className="py-3 px-4">Quality Name</th>
                  <th className="py-3 px-4">Movement / Destination</th>
                  <th className="py-3 px-4 text-right">Net KG</th>
                  <th className="py-3 px-4 text-right">Bobbins</th>
                  <th className="py-3 px-4 text-right">Crates</th>
                  <th className="py-3 px-4">Operator / Sign</th>
                  <th className="py-3 px-4 text-center w-24">Slip Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 italic">
                      No stock movement transactions recorded for the selected scope.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isInward = tx.type === "INWARD";
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          {isInward ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ArrowDownLeft className="h-3 w-3" />
                              <span>IN (Recv)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                              <ArrowUpRight className="h-3 w-3" />
                              <span>OUT (Issue)</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-800 text-[11px]">
                          {tx.referenceNo}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{tx.date}</div>
                          <div className="text-[10px] text-slate-500 uppercase">{tx.shiftName}</div>
                        </td>

                        <td className="py-3 px-4">
                          <RecipeQualityBadge value={tx.recipeQuality} />
                        </td>

                        <td className="py-3 px-4 text-xs font-semibold">
                          {isInward ? (
                            <span className="text-emerald-700">Tape Plant Output (Post-Prod)</span>
                          ) : (
                            <span className="text-purple-700">
                              {tx.loomIdentifier || (tx.loomNumber ? `Loom #${tx.loomNumber}` : "Loom Shed")}
                            </span>
                          )}
                        </td>

                        <td
                          className={`py-3 px-4 text-right font-mono font-black ${
                            isInward ? "text-emerald-700" : "text-purple-700"
                          }`}
                        >
                          {isInward ? "+" : "−"}
                          {tx.netKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                          <span className="text-[10px] font-normal text-slate-500">kg</span>
                        </td>

                        <td
                          className={`py-3 px-4 text-right font-mono font-black ${
                            isInward ? "text-blue-700" : "text-purple-700"
                          }`}
                        >
                          {isInward ? "+" : "−"}
                          {tx.bobbins.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                          <span className="text-[10px] font-normal text-slate-500">pcs</span>
                        </td>

                        <td
                          className={`py-3 px-4 text-right font-mono font-black ${
                            isInward ? "text-slate-800" : "text-purple-700"
                          }`}
                        >
                          {isInward ? "+" : "−"}
                          {tx.crates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                          <span className="text-[10px] font-normal text-slate-500">crates</span>
                        </td>

                        <td className="py-3 px-4 text-xs text-slate-600">
                          {tx.operator || "—"}
                          {tx.receiver && <span className="text-slate-400 block text-[10px]">To: {tx.receiver}</span>}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isInward ? (
                            <button
                              type="button"
                              onClick={() => handlePrintInwardSlip(tx)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors cursor-pointer"
                              title="Print Inward Production Slip"
                            >
                              <Printer className="h-3 w-3" />
                              <span>Inward Slip</span>
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
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                              title="Print Bobbin Issue Slip"
                            >
                              <Printer className="h-3 w-3" />
                              <span>Issue Slip</span>
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
