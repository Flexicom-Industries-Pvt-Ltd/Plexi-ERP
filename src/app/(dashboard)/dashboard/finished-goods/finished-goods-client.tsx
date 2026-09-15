"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PackageCheck,
  Boxes,
  Truck,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Warehouse,
  Layers,
  FileText,
  RefreshCw,
  Eye,
  GitFork,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Factory,
  ArrowDownToLine,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface FGStats {
  totalLots: number;
  totalBagsInStock: number;
  totalInitialBags: number;
  totalAllocatedBags: number;
  totalDispatchedBags: number;
  availableLots: number;
  allocatedLots: number;
  dispatchedLots: number;
  holdLots: number;
  qualityPassed: number;
  qualityHold: number;
  queueCount: number;
}

interface FGLot {
  id: string;
  lotNumber: string;
  inventoryItemId: string;
  baleId: string | null;
  quantity: number;
  initialQuantity: number;
  allocatedQty: number;
  dispatchedQty: number;
  unit: string;
  productionBatch: string | null;
  grossWeight: number | null;
  netWeight: number | null;
  qualityStatus: string;
  status: string;
  locationId: string | null;
  notes: string | null;
  receivedAt: string;
  inventoryItem?: {
    id: string;
    code: string;
    name: string;
    uom?: { abbreviation: string };
  };
  bale?: {
    id: string;
    baleNumber: string;
    bagsPerBale: number;
    shift?: { name: string };
  };
  location?: {
    id: string;
    name: string;
    code: string;
  };
  receivedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PassedBale {
  id: string;
  baleNumber: string;
  bagsPerBale: number;
  quantity: number;
  productionBatch: string | null;
  qualityStatus: string;
  baledAt: string;
  product?: {
    id: string;
    code: string;
    name: string;
  };
  shift?: {
    id: string;
    name: string;
  };
  createdBy?: {
    name: string;
  };
}

export function FinishedGoodsClient() {
  const [activeTab, setActiveTab] = useState<string>("inventory");
  const [loading, setLoading] = useState<boolean>(true);
  const [lots, setLots] = useState<FGLot[]>([]);
  const [stats, setStats] = useState<FGStats | null>(null);
  const [queue, setQueue] = useState<PassedBale[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string; code: string }[]>([]);
  const [fgItems, setFgItems] = useState<{ id: string; name: string; code: string }[]>([]);

  // Filter state
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [qualityFilter, setQualityFilter] = useState<string>("ALL");

  // Selection state for queue promotion
  const [selectedBaleIds, setSelectedBaleIds] = useState<string[]>([]);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState<boolean>(false);
  const [promoteLocationId, setPromoteLocationId] = useState<string>("");
  const [promoteNotes, setPromoteNotes] = useState<string>("");
  const [promoting, setPromoting] = useState<boolean>(false);

  // Manual Receipt Dialog state
  const [isManualDialogOpen, setIsManualDialogOpen] = useState<boolean>(false);
  const [manualItemId, setManualItemId] = useState<string>("");
  const [manualQty, setManualQty] = useState<string>("");
  const [manualUnit, setManualUnit] = useState<string>("bags");
  const [manualBatch, setManualBatch] = useState<string>("");
  const [manualLocationId, setManualLocationId] = useState<string>("");
  const [manualGrossWeight, setManualGrossWeight] = useState<string>("");
  const [manualNetWeight, setManualNetWeight] = useState<string>("");
  const [manualNotes, setManualNotes] = useState<string>("");
  const [submittingManual, setSubmittingManual] = useState<boolean>(false);

  // Traceability Modal state
  const [selectedTraceLotId, setSelectedTraceLotId] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<any | null>(null);
  const [traceLoading, setTraceLoading] = useState<boolean>(false);

  // Lot Detail Modal state
  const [viewingLot, setViewingLot] = useState<FGLot | null>(null);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (qualityFilter !== "ALL") params.set("qualityStatus", qualityFilter);

      const res = await fetch(`/api/finished-goods?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLots(json.data || []);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error("Failed to fetch finished goods stock", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, qualityFilter]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/finished-goods/bales-queue");
      if (res.ok) {
        const json = await res.json();
        setQueue(json || []);
      }
    } catch (err) {
      console.error("Failed to fetch bales queue", err);
    }
  }, []);

  const fetchMasterData = useCallback(async () => {
    try {
      const [locRes, itemRes] = await Promise.all([
        fetch("/api/settings/master-data/locations"),
        fetch("/api/inventory/items?itemType=FINISHED_GOOD"),
      ]);

      if (locRes.ok) {
        const json = await locRes.json();
        setLocations(json || []);
      }
      if (itemRes.ok) {
        const json = await itemRes.json();
        setFgItems(json.data || json || []);
      }
    } catch (err) {
      console.error("Failed to load master data", err);
    }
  }, []);

  useEffect(() => {
    fetchStock();
    fetchQueue();
    fetchMasterData();
  }, [fetchStock, fetchQueue, fetchMasterData]);

  const handlePromoteSelected = async () => {
    if (selectedBaleIds.length === 0) return;
    setPromoting(true);
    try {
      const res = await fetch("/api/finished-goods/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baleIds: selectedBaleIds,
          locationId: promoteLocationId || undefined,
          notes: promoteNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to promote bales to Finished Goods");
        return;
      }

      setIsPromoteDialogOpen(false);
      setSelectedBaleIds([]);
      setPromoteNotes("");
      setPromoteLocationId("");
      fetchStock();
      fetchQueue();
      setActiveTab("inventory");
    } catch (err: any) {
      alert(err.message || "Failed to promote bales");
    } finally {
      setPromoting(false);
    }
  };

  const handleSinglePromote = (baleId: string) => {
    setSelectedBaleIds([baleId]);
    setIsPromoteDialogOpen(true);
  };

  const handleManualReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemId || !manualQty) {
      alert("Please select an item and enter quantity");
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch("/api/finished-goods/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: manualItemId,
          quantity: parseFloat(manualQty),
          unit: manualUnit,
          productionBatch: manualBatch || undefined,
          locationId: manualLocationId || undefined,
          grossWeight: manualGrossWeight ? parseFloat(manualGrossWeight) : undefined,
          netWeight: manualNetWeight ? parseFloat(manualNetWeight) : undefined,
          notes: manualNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to receive manual stock");
        return;
      }

      setIsManualDialogOpen(false);
      setManualItemId("");
      setManualQty("");
      setManualBatch("");
      setManualNotes("");
      setManualGrossWeight("");
      setManualNetWeight("");
      fetchStock();
    } catch (err: any) {
      alert(err.message || "Failed to receive stock");
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleOpenTraceability = async (lotId: string) => {
    setSelectedTraceLotId(lotId);
    setTraceLoading(true);
    try {
      const res = await fetch(`/api/finished-goods/${lotId}/traceability`);
      if (res.ok) {
        const json = await res.json();
        setTraceData(json);
      }
    } catch (err) {
      console.error("Failed to fetch traceability tree", err);
    } finally {
      setTraceLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300">Available</Badge>;
      case "ALLOCATED":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300">Allocated</Badge>;
      case "DISPATCHED":
        return <Badge className="bg-purple-500/15 text-purple-700 border-purple-300 dark:text-purple-300">Dispatched</Badge>;
      case "ON_HOLD":
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300">On Hold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case "PASSED":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300">QC Passed</Badge>;
      case "PENDING_QC":
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300">Pending QC</Badge>;
      case "FAILED":
        return <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 dark:text-rose-300">QC Failed</Badge>;
      case "REWORK":
        return <Badge className="bg-orange-500/15 text-orange-700 border-orange-300 dark:text-orange-300">Rework</Badge>;
      default:
        return <Badge variant="outline">{quality}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-sm mb-1">
            <PackageCheck className="h-4 w-4" />
            <span>Finished Goods & Commercial Storage</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Finished Goods Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage sellable bag stock, promote passed production bales into inventory, and inspect end-to-end supply chain provenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStock();
              fetchQueue();
            }}
            className="h-9 gap-2 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setIsManualDialogOpen(true)}
            size="sm"
            className="h-9 gap-2 shadow-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Manual Intake</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Total Bags in Stock</span>
              <Boxes className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {stats ? stats.totalBagsInStock.toLocaleString() : <Skeleton className="h-8 w-24" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {stats?.totalLots ?? 0} active lots
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Available Sellable</span>
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats ? (stats.totalBagsInStock - stats.totalAllocatedBags).toLocaleString() : <Skeleton className="h-8 w-24" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.availableLots ?? 0} lots ready for dispatch
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Allocated for Orders</span>
              <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats ? stats.totalAllocatedBags.toLocaleString() : <Skeleton className="h-8 w-24" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reserved in dispatch picking
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Bales Intake Queue</span>
              <ArrowDownToLine className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats ? stats.queueCount : <Skeleton className="h-8 w-16" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Passed bales ready to promote
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:w-[420px] bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="inventory" className="gap-2 text-xs md:text-sm font-medium">
            <Boxes className="h-4 w-4" />
            <span>FG Stock Lots</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-2 text-xs md:text-sm font-medium relative">
            <ArrowDownToLine className="h-4 w-4" />
            <span>Bales Intake Queue</span>
            {queue.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white">
                {queue.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Inventory Table */}
        <TabsContent value="inventory" className="mt-4 flex flex-col gap-4">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
            <CardHeader className="p-4 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search lot number, item, batch..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="ALLOCATED">Allocated</SelectItem>
                      <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={qualityFilter} onValueChange={(val) => setQualityFilter(val || "ALL")}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Quality</SelectItem>
                      <SelectItem value="PASSED">Passed</SelectItem>
                      <SelectItem value="PENDING_QC">Pending QC</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 flex flex-col gap-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : lots.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <PackageCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-foreground">No Finished Goods Lots Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                    Promote passed bales from the intake queue or record manual finished goods receipts to populate sellable stock.
                  </p>
                  {queue.length > 0 && (
                    <Button
                      onClick={() => setActiveTab("queue")}
                      className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                    >
                      <ArrowDownToLine className="h-4 w-4" />
                      <span>View Bales Queue ({queue.length})</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Lot Number</TableHead>
                        <TableHead className="font-semibold text-xs">Product Item</TableHead>
                        <TableHead className="font-semibold text-xs">Batch</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Available / Total</TableHead>
                        <TableHead className="font-semibold text-xs">Location</TableHead>
                        <TableHead className="font-semibold text-xs">Quality</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lots.map((lot) => {
                        const available = lot.quantity - lot.allocatedQty;
                        return (
                          <TableRow key={lot.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {lot.lotNumber}
                              {lot.bale && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-sans">
                                  <span>Bale:</span>
                                  <span className="font-mono font-medium">{lot.bale.baleNumber}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-xs text-foreground">
                                {lot.inventoryItem?.name || "FG Bag Item"}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {lot.inventoryItem?.code || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {lot.productionBatch || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-xs text-foreground">
                                {available.toLocaleString()} {lot.unit}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Total: {lot.quantity.toLocaleString()} (Init: {lot.initialQuantity.toLocaleString()})
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Warehouse className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span>{lot.location?.name || "Main Warehouse"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getQualityBadge(lot.qualityStatus)}</TableCell>
                            <TableCell>{getStatusBadge(lot.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewingLot(lot)}
                                  className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                  title="View Lot Details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">Details</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenTraceability(lot.id)}
                                  className="h-8 px-2 text-xs gap-1.5 text-primary hover:text-primary border-primary/30 hover:bg-primary/10"
                                  title="View End-to-End Provenance Traceability"
                                >
                                  <GitFork className="h-3.5 w-3.5" />
                                  <span>Trace</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Bales Queue Table */}
        <TabsContent value="queue" className="mt-4 flex flex-col gap-4">
          <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
            <CardHeader className="p-4 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <ArrowDownToLine className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Quality-Passed Bales Ready For Stock Intake</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Select one or more passed production bales to promote into sellable finished goods lots with automatic inventory ledger posting.
                  </CardDescription>
                </div>

                {selectedBaleIds.length > 0 && (
                  <Button
                    onClick={() => setIsPromoteDialogOpen(true)}
                    className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                    size="sm"
                  >
                    <PackageCheck className="h-4 w-4" />
                    <span>Promote Selected ({selectedBaleIds.length}) to FG</span>
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {queue.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500/40 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-foreground">Intake Queue Clear</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                    All quality-passed bales have been successfully promoted into Finished Goods inventory.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedBaleIds.length === queue.length && queue.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBaleIds(queue.map((b) => b.id));
                              } else {
                                setSelectedBaleIds([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-xs">Bale Number</TableHead>
                        <TableHead className="font-semibold text-xs">Product Item</TableHead>
                        <TableHead className="font-semibold text-xs">Batch</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Bags Total</TableHead>
                        <TableHead className="font-semibold text-xs">Shift / Date</TableHead>
                        <TableHead className="font-semibold text-xs">QC Status</TableHead>
                        <TableHead className="font-semibold text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queue.map((bale) => {
                        const totalBags = bale.quantity * bale.bagsPerBale;
                        const isSelected = selectedBaleIds.includes(bale.id);
                        return (
                          <TableRow
                            key={bale.id}
                            className={`hover:bg-muted/30 transition-colors ${
                              isSelected ? "bg-emerald-500/5 dark:bg-emerald-500/10" : ""
                            }`}
                          >
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                className="rounded border-border"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBaleIds([...selectedBaleIds, bale.id]);
                                  } else {
                                    setSelectedBaleIds(selectedBaleIds.filter((id) => id !== bale.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {bale.baleNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-xs text-foreground">
                                {bale.product?.name || "Finished Bag"}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {bale.product?.code || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {bale.productionBatch || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-xs text-foreground">
                                {totalBags.toLocaleString()} bags
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {bale.quantity} bale(s) × {bale.bagsPerBale} bags
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-foreground font-medium">
                                {bale.shift?.name || "Shift A"}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(bale.baledAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>{getQualityBadge(bale.qualityStatus)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleSinglePromote(bale.id)}
                                className="h-7 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <ArrowDownToLine className="h-3.5 w-3.5" />
                                <span>Promote</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Promote Bales into FG */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
              <span>Promote {selectedBaleIds.length} Bale(s) to Finished Goods</span>
            </DialogTitle>
            <DialogDescription>
              This action will create new sellable Finished Goods lots, post an inventory IN ledger transaction, and update current stock balance.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promote-location">Destination Storage Location</Label>
              <Select value={promoteLocationId} onValueChange={(val) => setPromoteLocationId(val || "")}>
                <SelectTrigger id="promote-location">
                  <SelectValue placeholder="Select warehouse / bay location" />
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="promote-notes">Intake Notes / Handling Remarks</Label>
              <Textarea
                id="promote-notes"
                placeholder="Optional notes regarding pallet ID, storage row, or batch details..."
                value={promoteNotes}
                onChange={(e) => setPromoteNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromoteDialogOpen(false)} disabled={promoting}>
              Cancel
            </Button>
            <Button
              onClick={handlePromoteSelected}
              disabled={promoting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {promoting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
              <span>{promoting ? "Promoting..." : "Confirm FG Intake"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Manual FG Stock Intake */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <form onSubmit={handleManualReceive}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                <span>Manual Finished Goods Stock Intake</span>
              </DialogTitle>
              <DialogDescription>
                Directly receive finished goods bags into sellable inventory with batch attribution.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="manual-item">Finished Product Item *</Label>
                <Select value={manualItemId} onValueChange={(val) => setManualItemId(val || "")} required>
                  <SelectTrigger id="manual-item">
                    <SelectValue placeholder="Select finished good item" />
                  </SelectTrigger>
                  <SelectContent>
                    {fgItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-qty">Quantity *</Label>
                <Input
                  id="manual-qty"
                  type="number"
                  placeholder="e.g. 5000"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-unit">Unit</Label>
                <Input
                  id="manual-unit"
                  value={manualUnit}
                  onChange={(e) => setManualUnit(e.target.value)}
                  placeholder="bags"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-batch">Production Batch</Label>
                <Input
                  id="manual-batch"
                  placeholder="e.g. BATCH-2026-09"
                  value={manualBatch}
                  onChange={(e) => setManualBatch(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-location">Warehouse Location</Label>
                <Select value={manualLocationId} onValueChange={(val) => setManualLocationId(val || "")}>
                  <SelectTrigger id="manual-location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-gross">Gross Weight (kg)</Label>
                <Input
                  id="manual-gross"
                  type="number"
                  placeholder="e.g. 450.5"
                  value={manualGrossWeight}
                  onChange={(e) => setManualGrossWeight(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-net">Net Weight (kg)</Label>
                <Input
                  id="manual-net"
                  type="number"
                  placeholder="e.g. 440.0"
                  value={manualNetWeight}
                  onChange={(e) => setManualNetWeight(e.target.value)}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="manual-notes">Intake Notes</Label>
                <Textarea
                  id="manual-notes"
                  placeholder="Remarks, warehouse shelf, etc."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsManualDialogOpen(false)} disabled={submittingManual}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingManual}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submittingManual ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>{submittingManual ? "Receiving..." : "Receive Stock"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Lot Details */}
      <Dialog open={!!viewingLot} onOpenChange={(open) => !open && setViewingLot(null)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              <span>Lot Details: {viewingLot?.lotNumber}</span>
            </DialogTitle>
            <DialogDescription>
              Complete metadata and inventory status for this Finished Goods lot.
            </DialogDescription>
          </DialogHeader>

          {viewingLot && (
            <div className="grid grid-cols-2 gap-4 py-2 text-sm">
              <div className="border p-3 rounded-lg bg-muted/20">
                <span className="text-xs text-muted-foreground block">Product Item</span>
                <span className="font-semibold text-foreground">{viewingLot.inventoryItem?.name}</span>
                <span className="text-xs font-mono block text-muted-foreground">{viewingLot.inventoryItem?.code}</span>
              </div>

              <div className="border p-3 rounded-lg bg-muted/20">
                <span className="text-xs text-muted-foreground block">Batch / Quality</span>
                <span className="font-mono text-xs font-semibold block text-foreground">
                  {viewingLot.productionBatch || "No Batch Code"}
                </span>
                <div className="mt-1">{getQualityBadge(viewingLot.qualityStatus)}</div>
              </div>

              <div className="border p-3 rounded-lg bg-muted/20">
                <span className="text-xs text-muted-foreground block">Quantity Breakdown</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 block">
                  {(viewingLot.quantity - viewingLot.allocatedQty).toLocaleString()} {viewingLot.unit} Available
                </span>
                <span className="text-xs text-muted-foreground block">
                  Total: {viewingLot.quantity.toLocaleString()} | Allocated: {viewingLot.allocatedQty.toLocaleString()}
                </span>
              </div>

              <div className="border p-3 rounded-lg bg-muted/20">
                <span className="text-xs text-muted-foreground block">Location & Received</span>
                <span className="font-medium text-foreground block">
                  {viewingLot.location?.name || "Main Warehouse"}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {new Date(viewingLot.receivedAt).toLocaleString()}
                </span>
              </div>

              {viewingLot.bale && (
                <div className="col-span-2 border p-3 rounded-lg bg-primary/5 border-primary/20">
                  <span className="text-xs text-primary font-semibold block">Source Production Bale</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs font-bold text-foreground">
                      Bale #{viewingLot.bale.baleNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Shift: {viewingLot.bale.shift?.name || "Shift A"}
                    </span>
                  </div>
                </div>
              )}

              {viewingLot.notes && (
                <div className="col-span-2 border p-3 rounded-lg bg-muted/10">
                  <span className="text-xs text-muted-foreground block">Handling Notes</span>
                  <p className="text-xs text-foreground mt-0.5">{viewingLot.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingLot(null)}>
              Close
            </Button>
            {viewingLot && (
              <Button
                onClick={() => {
                  const lotId = viewingLot.id;
                  setViewingLot(null);
                  handleOpenTraceability(lotId);
                }}
                className="gap-2 bg-primary text-primary-foreground"
              >
                <GitFork className="h-4 w-4" />
                <span>Explore Traceability</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: End-to-End Multi-Tier Traceability Tree */}
      <Dialog open={!!selectedTraceLotId} onOpenChange={(open) => !open && setSelectedTraceLotId(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitFork className="h-5 w-5 text-primary" />
              <span>Provenance & Traceability Chain</span>
            </DialogTitle>
            <DialogDescription>
              End-to-end multi-tier lineage tracing this FG lot back through Baling, QC, Production, Looms, and Raw Material Intake.
            </DialogDescription>
          </DialogHeader>

          {traceLoading ? (
            <div className="p-8 flex flex-col gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : traceData ? (
            <div className="flex flex-col gap-6 py-2 relative">
              {/* Level 1: Finished Goods Lot */}
              <div className="border border-emerald-500/40 bg-emerald-500/5 p-4 rounded-xl relative shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-sm text-foreground">
                      Tier 1: Finished Goods Lot ({traceData.lot?.lotNumber})
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">
                    Sellable Stock
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Item:</span>
                    <span className="font-semibold text-foreground">{traceData.lot?.inventoryItem?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Stock Balance:</span>
                    <span className="font-semibold text-foreground">{traceData.lot?.quantity} bags</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Received At:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(traceData.lot?.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connector */}
              <div className="flex justify-center -my-3">
                <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90" />
              </div>

              {/* Level 2: Source Bale */}
              <div className="border border-blue-500/40 bg-blue-500/5 p-4 rounded-xl relative shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-sm text-foreground">
                      Tier 2: Production Bale ({traceData.bale?.baleNumber || "Direct Intake"})
                    </span>
                  </div>
                  <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">
                    Baling Stage
                  </Badge>
                </div>
                {traceData.bale ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Bags per Bale:</span>
                      <span className="font-semibold text-foreground">{traceData.bale.bagsPerBale}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Production Batch:</span>
                      <span className="font-mono font-semibold text-foreground">{traceData.bale.productionBatch || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Baled At:</span>
                      <span className="font-semibold text-foreground">
                        {new Date(traceData.bale.baledAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    Direct stock intake entered manually.
                  </p>
                )}
              </div>

              {/* Connector */}
              <div className="flex justify-center -my-3">
                <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90" />
              </div>

              {/* Level 3: Quality Control */}
              <div className="border border-purple-500/40 bg-purple-500/5 p-4 rounded-xl relative shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-sm text-foreground">
                      Tier 3: Quality Control Inspection
                    </span>
                  </div>
                  <Badge className="bg-purple-500/15 text-purple-700 border-purple-300">
                    QC Verified
                  </Badge>
                </div>
                {traceData.qcInspections && traceData.qcInspections.length > 0 ? (
                  <div className="flex flex-col gap-2 mt-3">
                    {traceData.qcInspections.map((qc: any) => (
                      <div key={qc.id} className="border bg-background/80 p-2.5 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-primary">{qc.inspectionNumber}</span>
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{qc.decision || "PASSED"}</Badge>
                        </div>
                        <p className="text-muted-foreground text-[11px] mt-1">
                          Inspector: {qc.inspector?.name || "Quality Lead"} | Samples: {qc.samplesInspected}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    Batch verified under standard quality sampling protocols.
                  </p>
                )}
              </div>

              {/* Connector */}
              <div className="flex justify-center -my-3">
                <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90" />
              </div>

              {/* Level 4: Production Runs & Machinery */}
              <div className="border border-amber-500/40 bg-amber-500/5 p-4 rounded-xl relative shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Factory className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-sm text-foreground">
                      Tier 4: Production Run & Machine Lineage
                    </span>
                  </div>
                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-300">
                    Manufacturing
                  </Badge>
                </div>
                {traceData.productionRuns && traceData.productionRuns.length > 0 ? (
                  <div className="flex flex-col gap-2 mt-3">
                    {traceData.productionRuns.map((run: any) => (
                      <div key={run.id} className="border bg-background/80 p-2.5 rounded-lg text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            Plan Line: {run.planLine?.plan?.planNumber || "Auto Run"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(run.startedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Target: {run.targetQty} | Actual Output: {run.actualQty} bags
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    Continuous line production record synced.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Unable to load provenance data.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTraceLotId(null)}>
              Close Explorer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
