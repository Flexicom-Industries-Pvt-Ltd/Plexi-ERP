"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Recycle,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Box,
  MapPin,
  Scale,
  Factory,
  PackagePlus,
  XCircle,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface RecyclingBatch {
  id: string;
  batchNumber: string;
  inputScrapQty: number;
  outputRpQty: number | null;
  wasteLossQty: number | null;
  granuleGrade: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  outputItemId: string | null;
  outputLocationId: string | null;
  operatorId: string | null;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  outputItem?: { id: string; code: string; name: string } | null;
  outputLocation?: { id: string; code: string; name: string } | null;
  operator?: { id: string; name: string; employeeId: string | null } | null;
  _count?: { scrapRecords: number };
}

interface ScrapRecord {
  id: string;
  scrapNumber: string;
  phase: string;
  reasonCode: string;
  quantity: number;
  unit: string;
  recordedAt: string;
  inventoryItem?: { id: string; code: string; name: string } | null;
  location?: { id: string; code: string; name: string } | null;
  recordedBy?: { id: string; name: string } | null;
}

interface RecyclingStats {
  totalBatches: number;
  completedCount: number;
  inProgressCount: number;
  totalInputScrap: number;
  totalOutputRp: number;
  totalWasteLoss: number;
  availableScrapWeight: number;
  availableScrapCount: number;
  overallYieldPct: number;
  gradeBreakdown: Record<string, { input: number; output: number }>;
}

export function RecyclingClient() {
  const [activeTab, setActiveTab] = useState("batches");
  const [batches, setBatches] = useState<RecyclingBatch[]>([]);
  const [availableScrap, setAvailableScrap] = useState<ScrapRecord[]>([]);
  const [stats, setStats] = useState<RecyclingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Inventory Items & Locations for dropdown
  const [inventoryItems, setInventoryItems] = useState<{ id: string; code: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);

  // Batch Creation Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedScrapIds, setSelectedScrapIds] = useState<string[]>([]);
  const [granuleGrade, setGranuleGrade] = useState("RP-PP-GRADE-A");
  const [outputLocationId, setOutputLocationId] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  // Batch Completion Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<RecyclingBatch | null>(null);
  const [outputRpQty, setOutputRpQty] = useState<number | "">("");
  const [outputItemId, setOutputItemId] = useState("");
  const [completeLocationId, setCompleteLocationId] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");

  const [isPending, startTransition] = useTransition();

  const fetchRecyclingData = async () => {
    try {
      setLoading(true);
      const [batchesRes, scrapRes, statsRes] = await Promise.all([
        fetch("/api/recycling/batches?limit=100"),
        fetch("/api/recycling/available-scrap"),
        fetch("/api/recycling/stats"),
      ]);

      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setBatches(data.data?.batches || []);
      }

      if (scrapRes.ok) {
        const data = await scrapRes.json();
        setAvailableScrap(data.data?.records || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data?.stats || null);
      }
    } catch (err: any) {
      toast.error("Failed to load recycling plant data");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryAndLocations = async () => {
    try {
      const [itemsRes, locsRes] = await Promise.all([
        fetch("/api/inventory/items?limit=100"),
        fetch("/api/settings/master-data/locations?limit=50"),
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setInventoryItems(data.data?.items || data.data || []);
      }

      if (locsRes.ok) {
        const data = await locsRes.json();
        setLocations(data.data?.records || data.data || []);
      }
    } catch {
      // Non-critical fallback
    }
  };

  useEffect(() => {
    fetchRecyclingData();
    fetchInventoryAndLocations();
  }, []);

  const handleToggleSelectScrap = (id: string) => {
    setSelectedScrapIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllScrap = () => {
    if (selectedScrapIds.length === availableScrap.length) {
      setSelectedScrapIds([]);
    } else {
      setSelectedScrapIds(availableScrap.map((s) => s.id));
    }
  };

  const totalSelectedScrapWeight = availableScrap
    .filter((s) => selectedScrapIds.includes(s.id))
    .reduce((sum, s) => sum + s.quantity, 0);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedScrapIds.length === 0) {
      toast.error("Please select at least one scrap record to recycle");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/recycling/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scrapRecordIds: selectedScrapIds,
            granuleGrade,
            outputLocationId: outputLocationId || undefined,
            notes: createNotes || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to create recycling batch");
        }

        toast.success(`Recycling batch ${json.data.batchNumber} started successfully!`);
        setCreateModalOpen(false);
        setSelectedScrapIds([]);
        setCreateNotes("");
        fetchRecyclingData();
      } catch (err: any) {
        toast.error(err.message || "Failed to create recycling batch");
      }
    });
  };

  const openCompleteModal = (batch: RecyclingBatch) => {
    setSelectedBatch(batch);
    setOutputRpQty(batch.inputScrapQty ? Math.round(batch.inputScrapQty * 0.92 * 100) / 100 : "");
    setOutputItemId(inventoryItems[0]?.id || "");
    setCompleteLocationId(batch.outputLocationId || locations[0]?.id || "");
    setCompleteNotes("");
    setCompleteModalOpen(true);
  };

  const handleCompleteBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    if (!outputRpQty || Number(outputRpQty) <= 0) {
      toast.error("Please enter a valid output RP granule quantity");
      return;
    }
    if (!outputItemId) {
      toast.error("Please select an inventory item for the output RP granules");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/recycling/batches/${selectedBatch.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outputRpQty: Number(outputRpQty),
            outputItemId,
            outputLocationId: completeLocationId || undefined,
            notes: completeNotes || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to complete recycling batch");
        }

        toast.success(
          `Batch ${selectedBatch.batchNumber} completed! ${outputRpQty} kg RP granules deposited into stock.`
        );
        setCompleteModalOpen(false);
        setSelectedBatch(null);
        fetchRecyclingData();
      } catch (err: any) {
        toast.error(err.message || "Failed to complete batch");
      }
    });
  };

  const filteredBatches = batches.filter((b) => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.batchNumber.toLowerCase().includes(term) ||
      (b.granuleGrade && b.granuleGrade.toLowerCase().includes(term)) ||
      (b.outputItem && b.outputItem.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Recycle className="h-7 w-7 text-emerald-600 animate-spin-slow" />
              Recycling Plant & RP Granules
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Reprocess production scrap & waste into premium RP granules, monitor extrusion conversion yield, and restock raw materials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecyclingData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Recycling Batch
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              RP Granules Produced
            </span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.totalOutputRp?.toLocaleString() || "0"}
            </span>
            <span className="text-sm font-medium text-slate-500">kg</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {stats?.completedCount || 0} batches processed into inventory
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Scrap Reprocessed
            </span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.totalInputScrap?.toLocaleString() || "0"}
            </span>
            <span className="text-sm font-medium text-slate-500">kg</span>
          </div>
          <p className="text-xs text-blue-600 font-medium mt-1">
            Total scrap diverted from landfill
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Conversion Yield
            </span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-purple-600">
              {stats?.overallYieldPct || 0}%
            </span>
            <span className="text-xs font-medium text-slate-400">efficiency</span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Loss: {stats?.totalWasteLoss?.toLocaleString() || "0"} kg
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unbatched Scrap Queue
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-600">
              {stats?.availableScrapWeight?.toLocaleString() || "0"}
            </span>
            <span className="text-sm font-medium text-slate-500">kg</span>
          </div>
          <p className="text-xs text-amber-600 font-medium mt-1">
            {stats?.availableScrapCount || 0} scrap records ready to recycle
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="batches" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Factory className="h-4 w-4" />
              Recycling Batches
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.2 text-[10px]">
                {batches.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Layers className="h-4 w-4" />
              Available Scrap Queue
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800">
                {availableScrap.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Yield & Grade Breakdown
            </TabsTrigger>
          </TabsList>

          {activeTab === "batches" && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search batch number, grade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 w-48 sm:w-64 text-xs bg-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="h-9 w-36 text-xs bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tab 1: Batches List */}
        <TabsContent value="batches" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3">Granule Grade</th>
                    <th className="px-4 py-3">Input Scrap</th>
                    <th className="px-4 py-3">Output RP</th>
                    <th className="px-4 py-3">Yield %</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Operator & Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        <Recycle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-slate-600">No recycling batches found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Create a batch from available scrap to start reprocessing.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => {
                      const yieldPct =
                        batch.outputRpQty && batch.inputScrapQty > 0
                          ? Math.round((batch.outputRpQty / batch.inputScrapQty) * 10000) / 100
                          : null;

                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {batch.batchNumber}
                            <div className="text-[11px] font-normal text-slate-500">
                              {batch._count?.scrapRecords || 0} scrap records linked
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="bg-slate-100 border-slate-300 font-mono text-xs">
                              {batch.granuleGrade || "STANDARD"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {batch.inputScrapQty.toLocaleString()} kg
                          </td>
                          <td className="px-4 py-3 font-medium text-emerald-700">
                            {batch.outputRpQty ? `${batch.outputRpQty.toLocaleString()} kg` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {yieldPct !== null ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                  yieldPct >= 90
                                    ? "bg-emerald-100 text-emerald-800"
                                    : yieldPct >= 80
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {yieldPct}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Processing</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {batch.status === "IN_PROGRESS" && (
                              <Badge className="bg-amber-500 text-white flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3 animate-spin" /> In Progress
                              </Badge>
                            )}
                            {batch.status === "COMPLETED" && (
                              <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" /> Completed
                              </Badge>
                            )}
                            {batch.status === "CANCELLED" && (
                              <Badge variant="secondary" className="bg-slate-200 text-slate-600 w-fit">
                                Cancelled
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            <div>{batch.operator?.name || "System"}</div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(batch.startedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {batch.status === "IN_PROGRESS" ? (
                              <Button
                                size="sm"
                                onClick={() => openCompleteModal(batch)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
                              >
                                <PackagePlus className="h-3.5 w-3.5 mr-1" />
                                Complete & Stock IN
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400 font-mono">
                                {batch.outputItem?.name || "Deposited"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Available Scrap Queue */}
        <TabsContent value="queue" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllScrap}
                className="text-xs bg-slate-50"
              >
                {selectedScrapIds.length === availableScrap.length ? "Deselect All" : "Select All Available"}
              </Button>
              <span className="text-xs text-slate-600">
                Selected: <strong>{selectedScrapIds.length}</strong> items (
                <strong>{totalSelectedScrapWeight.toLocaleString()} kg</strong>)
              </span>
            </div>

            <Button
              size="sm"
              disabled={selectedScrapIds.length === 0}
              onClick={() => setCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
            >
              <Recycle className="h-4 w-4" />
              Batch Selected Scrap ({totalSelectedScrapWeight.toLocaleString()} kg)
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">Select</th>
                    <th className="px-4 py-3">Scrap #</th>
                    <th className="px-4 py-3">Phase</th>
                    <th className="px-4 py-3">Reason / Defect</th>
                    <th className="px-4 py-3">Weight (kg)</th>
                    <th className="px-4 py-3">Item / Location</th>
                    <th className="px-4 py-3">Recorded Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableScrap.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                        <FileCheck2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-slate-600">All scrap records have been batched and recycled!</p>
                        <p className="text-xs text-slate-400 mt-1">
                          New scrap recorded from Loom, Lamination, Printing, or QC will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    availableScrap.map((scrap) => {
                      const isSelected = selectedScrapIds.includes(scrap.id);
                      return (
                        <tr
                          key={scrap.id}
                          onClick={() => handleToggleSelectScrap(scrap.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Controlled by row click
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{scrap.scrapNumber}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs bg-slate-100">
                              {scrap.phase}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{scrap.reasonCode}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{scrap.quantity} kg</td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            <div>{scrap.inventoryItem?.name || "General Scrap"}</div>
                            <div className="text-slate-400">{scrap.location?.name || "Shop Floor"}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {new Date(scrap.recordedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Yield & Analytics */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Polymer Extrusion Yield Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Total Input Scrap Weight:</span>
                  <span className="font-bold text-slate-900">
                    {stats?.totalInputScrap?.toLocaleString() || "0"} kg
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-600">RP Granules Output:</span>
                  <span className="font-bold text-emerald-600">
                    {stats?.totalOutputRp?.toLocaleString() || "0"} kg
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Process Volatilization / Waste Loss:</span>
                  <span className="font-bold text-amber-600">
                    {stats?.totalWasteLoss?.toLocaleString() || "0"} kg
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-semibold text-slate-900">Overall Yield Conversion:</span>
                  <span className="text-xl font-extrabold text-purple-700">
                    {stats?.overallYieldPct || 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Yield Breakdown by Granule Grade
              </h3>
              {stats?.gradeBreakdown && Object.keys(stats.gradeBreakdown).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.gradeBreakdown).map(([grade, val]) => {
                    const gradeYield =
                      val.input > 0 ? Math.round((val.output / val.input) * 10000) / 100 : 0;
                    return (
                      <div key={grade} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-xs text-slate-900 font-mono">{grade}</span>
                          <span className="text-xs font-bold text-emerald-700">{gradeYield}% Yield</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Input: {val.input.toLocaleString()} kg</span>
                          <span>Output: {val.output.toLocaleString()} kg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No completed recycling batches yet. Complete a batch to view grade analytics.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Create Recycling Batch */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Recycle className="h-5 w-5 text-emerald-600" />
              Start New Recycling Batch
            </DialogTitle>
            <DialogDescription>
              Group selected production scrap into an RP extrusion batch to reprocess into polymer granules.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBatch} className="space-y-4 mt-2">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Selected Scrap Input
                </span>
                <div className="text-lg font-bold text-emerald-950">
                  {totalSelectedScrapWeight.toLocaleString()} kg
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white">
                {selectedScrapIds.length} Scrap Items
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Granule Grade / Recipe</Label>
              <Select value={granuleGrade} onValueChange={(val) => setGranuleGrade(val || "")}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select granule grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RP-PP-GRADE-A">RP-PP-GRADE-A (Virgin Blend Quality)</SelectItem>
                  <SelectItem value="RP-PP-GRADE-B">RP-PP-GRADE-B (Standard Weft Quality)</SelectItem>
                  <SelectItem value="RP-HDPE">RP-HDPE (High Density Recycled)</SelectItem>
                  <SelectItem value="RP-LPP">RP-LPP (Laminated Scrap Granules)</SelectItem>
                  <SelectItem value="STANDARD">STANDARD RP (General Purpose)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Target Warehouse Location</Label>
              <Select value={outputLocationId} onValueChange={(val) => setOutputLocationId(val || "")}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select destination warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Batch Notes / Extruder Temp</Label>
              <Textarea
                placeholder="Optional extruder setup, temperature profile, or blend ratio..."
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || selectedScrapIds.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {isPending ? "Creating..." : "Start Recycling Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Complete Batch & Stock IN */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <PackagePlus className="h-5 w-5 text-emerald-600" />
              Complete Batch & Deposit RP Granules
            </DialogTitle>
            <DialogDescription>
              Record the actual produced weight of RP granules. An inventory IN transaction will automatically be posted into stock.
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <form onSubmit={handleCompleteBatch} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Batch Number:</span>
                  <div className="font-semibold text-slate-900">{selectedBatch.batchNumber}</div>
                </div>
                <div>
                  <span className="text-slate-500">Input Scrap:</span>
                  <div className="font-bold text-slate-900">{selectedBatch.inputScrapQty} kg</div>
                </div>
                <div>
                  <span className="text-slate-500">Recipe / Grade:</span>
                  <div className="font-mono font-semibold text-slate-900">
                    {selectedBatch.granuleGrade || "STANDARD"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Expected Yield (~92%):</span>
                  <div className="font-semibold text-emerald-600">
                    {Math.round(selectedBatch.inputScrapQty * 0.92 * 100) / 100} kg
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Actual Output RP Quantity (kg) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 460.5"
                  value={outputRpQty}
                  onChange={(e) => setOutputRpQty(e.target.value ? Number(e.target.value) : "")}
                  className="text-sm font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Target Raw Material Inventory Item *</Label>
                <Select value={outputItemId} onValueChange={(val) => setOutputItemId(val || "")}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select raw material stock item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Storage Location</Label>
                <Select value={completeLocationId} onValueChange={(val) => setCompleteLocationId(val || "")}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select warehouse location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Completion Remarks / Quality Rating</Label>
                <Textarea
                  placeholder="MFI tested, granule color, impurity filter notes..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="text-xs"
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCompleteModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  {isPending ? "Posting Stock IN..." : "Complete & Deposit to Inventory"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
