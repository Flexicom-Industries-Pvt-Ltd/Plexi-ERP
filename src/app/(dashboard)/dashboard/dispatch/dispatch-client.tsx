"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  PackageCheck,
  Boxes,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Warehouse,
  FileText,
  RefreshCw,
  Eye,
  Check,
  ArrowRight,
  ShieldCheck,
  Layers,
  MapPin,
  User,
  Phone,
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

interface DispatchStats {
  totalOrders: number;
  draftOrders: number;
  confirmedOrders: number;
  pickingOrders: number;
  dispatchedOrders: number;
  totalOrderedQty: number;
  totalDispatchedQty: number;
  todayDispatchedQty: number;
}

interface DispatchAllocation {
  id: string;
  dispatchOrderLineId: string;
  finishedGoodsLotId: string;
  allocatedQty: number;
  loadedQty: number;
  status: string;
  finishedGoodsLot?: {
    lotNumber: string;
    productionBatch?: string;
    location?: { name: string };
  };
}

interface DispatchOrderLine {
  id: string;
  dispatchOrderId: string;
  inventoryItemId: string;
  orderedQty: number;
  pickedQty: number;
  loadedQty: number;
  unit: string;
  notes: string | null;
  inventoryItem?: {
    id: string;
    code: string;
    name: string;
    currentStock: number;
  };
  allocations: DispatchAllocation[];
}

interface DispatchOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerContact: string | null;
  customerAddress: string | null;
  status: string;
  gateEntryId: string | null;
  transporter: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  totalQty: number;
  dispatchedQty: number;
  dispatchedAt: string | null;
  notes: string | null;
  createdAt: string;
  lines: DispatchOrderLine[];
  createdBy?: { name: string; email: string };
  loadedBy?: { name: string; email: string };
  gateEntry?: { entryNumber: string; truckNumber: string; status: string };
}

export function DispatchClient() {
  const [activeTab, setActiveTab] = useState<string>("orders");
  const [loading, setLoading] = useState<boolean>(true);
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [stats, setStats] = useState<DispatchStats | null>(null);
  const [fgItems, setFgItems] = useState<{ id: string; name: string; code: string; currentStock: number }[]>([]);
  const [gateEntries, setGateEntries] = useState<{ id: string; entryNumber: string; truckNumber: string }[]>([]);

  // Filter state
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Order Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [newCustomer, setNewCustomer] = useState<string>("");
  const [newContact, setNewContact] = useState<string>("");
  const [newAddress, setNewAddress] = useState<string>("");
  const [newTransporter, setNewTransporter] = useState<string>("");
  const [newVehicle, setNewVehicle] = useState<string>("");
  const [newDriverName, setNewDriverName] = useState<string>("");
  const [newDriverPhone, setNewDriverPhone] = useState<string>("");
  const [newGateEntryId, setNewGateEntryId] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [orderLines, setOrderLines] = useState<{ inventoryItemId: string; orderedQty: number; unit: string }[]>([
    { inventoryItemId: "", orderedQty: 1000, unit: "bags" },
  ]);
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false);

  // Pick Modal state
  const [pickingOrder, setPickingOrder] = useState<DispatchOrder | null>(null);
  const [availableLotsByLine, setAvailableLotsByLine] = useState<Record<string, any[]>>({});
  const [selectedLots, setSelectedLots] = useState<Record<string, { lotId: string; qty: number }[]>>({});
  const [submittingPick, setSubmittingPick] = useState<boolean>(false);

  // Load & Dispatch Modal state
  const [loadingOrder, setLoadingOrder] = useState<DispatchOrder | null>(null);
  const [loadVehicle, setLoadVehicle] = useState<string>("");
  const [loadDriverName, setLoadDriverName] = useState<string>("");
  const [loadDriverPhone, setLoadDriverPhone] = useState<string>("");
  const [loadTransporter, setLoadTransporter] = useState<string>("");
  const [loadGateEntryId, setLoadGateEntryId] = useState<string>("");
  const [loadNotes, setLoadNotes] = useState<string>("");
  const [submittingLoad, setSubmittingLoad] = useState<boolean>(false);

  // View Details Modal state
  const [viewingOrder, setViewingOrder] = useState<DispatchOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/dispatch/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data || []);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error("Failed to fetch dispatch orders", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchMasterData = useCallback(async () => {
    try {
      const [itemRes, gateRes] = await Promise.all([
        fetch("/api/inventory/items?itemType=FINISHED_GOOD"),
        fetch("/api/gate?status=ARRIVED,VERIFIED,PARKING,READY"),
      ]);

      if (itemRes.ok) {
        const json = await itemRes.json();
        setFgItems(json.data || json || []);
      }
      if (gateRes.ok) {
        const json = await gateRes.json();
        setGateEntries(json.data || json || []);
      }
    } catch (err) {
      console.error("Failed to load master data", err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchMasterData();
  }, [fetchOrders, fetchMasterData]);

  const handleAddLine = () => {
    setOrderLines([...orderLines, { inventoryItemId: "", orderedQty: 1000, unit: "bags" }]);
  };

  const handleRemoveLine = (index: number) => {
    if (orderLines.length > 1) {
      setOrderLines(orderLines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: string, val: any) => {
    const updated = [...orderLines];
    updated[index] = { ...updated[index], [field]: val };
    setOrderLines(updated);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer) {
      alert("Customer name is required");
      return;
    }

    const invalidLines = orderLines.some((l) => !l.inventoryItemId || l.orderedQty <= 0);
    if (invalidLines) {
      alert("Please select an item and enter valid quantity for all order lines");
      return;
    }

    setSubmittingCreate(true);
    try {
      const res = await fetch("/api/dispatch/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newCustomer,
          customerContact: newContact || undefined,
          customerAddress: newAddress || undefined,
          transporter: newTransporter || undefined,
          vehicleNumber: newVehicle || undefined,
          driverName: newDriverName || undefined,
          driverPhone: newDriverPhone || undefined,
          gateEntryId: newGateEntryId || undefined,
          notes: newNotes || undefined,
          lines: orderLines,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to create dispatch order");
        return;
      }

      setIsCreateDialogOpen(false);
      setNewCustomer("");
      setNewContact("");
      setNewAddress("");
      setNewTransporter("");
      setNewVehicle("");
      setNewDriverName("");
      setNewDriverPhone("");
      setNewNotes("");
      setOrderLines([{ inventoryItemId: "", orderedQty: 1000, unit: "bags" }]);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Failed to create order");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleOpenPickModal = async (order: DispatchOrder) => {
    setPickingOrder(order);
    const lotMap: Record<string, any[]> = {};
    const initialSelections: Record<string, { lotId: string; qty: number }[]> = {};

    for (const line of order.lines) {
      try {
        const res = await fetch(`/api/dispatch/available-lots?itemId=${line.inventoryItemId}`);
        if (res.ok) {
          const lots = await res.json();
          lotMap[line.id] = lots || [];

          // Auto-allocate available lots up to needed quantity
          const needed = line.orderedQty - line.pickedQty;
          if (needed > 0 && lots && lots.length > 0) {
            let rem = needed;
            const linePicks: { lotId: string; qty: number }[] = [];
            for (const l of lots) {
              const avail = l.quantity - l.allocatedQty;
              if (avail > 0 && rem > 0) {
                const pickAmount = Math.min(avail, rem);
                linePicks.push({ lotId: l.id, qty: pickAmount });
                rem -= pickAmount;
              }
            }
            if (linePicks.length > 0) {
              initialSelections[line.id] = linePicks;
            }
          }
        }
      } catch (err) {
        console.error("Failed to load lots for line", err);
      }
    }

    setAvailableLotsByLine(lotMap);
    setSelectedLots(initialSelections);
  };

  const handleConfirmPick = async () => {
    if (!pickingOrder) return;

    const allocations: { dispatchOrderLineId: string; finishedGoodsLotId: string; quantity: number }[] = [];
    Object.entries(selectedLots).forEach(([lineId, picks]) => {
      picks.forEach((p) => {
        if (p.qty > 0) {
          allocations.push({
            dispatchOrderLineId: lineId,
            finishedGoodsLotId: p.lotId,
            quantity: p.qty,
          });
        }
      });
    });

    if (allocations.length === 0) {
      alert("Please select at least one lot with quantity to allocate");
      return;
    }

    setSubmittingPick(true);
    try {
      const res = await fetch(`/api/dispatch/orders/${pickingOrder.id}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to pick lots for order");
        return;
      }

      setPickingOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Failed to pick lots");
    } finally {
      setSubmittingPick(false);
    }
  };

  const handleOpenLoadModal = (order: DispatchOrder) => {
    setLoadingOrder(order);
    setLoadVehicle(order.vehicleNumber || "");
    setLoadDriverName(order.driverName || "");
    setLoadDriverPhone(order.driverPhone || "");
    setLoadTransporter(order.transporter || "");
    setLoadGateEntryId(order.gateEntryId || "");
    setLoadNotes(order.notes || "");
  };

  const handleConfirmLoad = async () => {
    if (!loadingOrder) return;
    setSubmittingLoad(true);
    try {
      const res = await fetch(`/api/dispatch/orders/${loadingOrder.id}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNumber: loadVehicle || undefined,
          driverName: loadDriverName || undefined,
          driverPhone: loadDriverPhone || undefined,
          transporter: loadTransporter || undefined,
          gateEntryId: loadGateEntryId || undefined,
          notes: loadNotes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to confirm loading");
        return;
      }

      setLoadingOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || "Failed to load order");
    } finally {
      setSubmittingLoad(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
      case "CONFIRMED":
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300">Confirmed</Badge>;
      case "PICKING":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300">Picking / Allocated</Badge>;
      case "LOADED":
        return <Badge className="bg-indigo-500/15 text-indigo-700 border-indigo-300 dark:text-indigo-300">Loaded</Badge>;
      case "DISPATCHED":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300">Dispatched</Badge>;
      case "CANCELLED":
        return <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 dark:text-rose-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-sm mb-1">
            <Truck className="h-4 w-4" />
            <span>Commercial Dispatch & Logistics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Dispatch Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create customer dispatch orders, pick and reserve Finished Goods lots, confirm truck loading, and post automated inventory OUT movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="h-9 gap-2 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            size="sm"
            className="h-9 gap-2 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>New Dispatch Order</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Total Dispatched Bags</span>
              <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {stats ? stats.totalDispatchedQty.toLocaleString() : <Skeleton className="h-8 w-24" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.todayDispatchedQty.toLocaleString() ?? 0} dispatched today
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Orders in Picking</span>
              <Boxes className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats ? stats.pickingOrders : <Skeleton className="h-8 w-16" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              FG stock lots allocated & ready to load
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Awaiting Picking</span>
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats ? stats.confirmedOrders : <Skeleton className="h-8 w-16" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Confirmed orders awaiting lot allocation
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider flex items-center justify-between">
              <span>Completed Shipments</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats ? stats.dispatchedOrders : <Skeleton className="h-8 w-16" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully fulfilled orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Container */}
      <Card className="border-border/60 bg-card/70 backdrop-blur-sm">
        <CardHeader className="p-4 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search order #, customer, truck, driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PICKING">Picking</SelectItem>
                  <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
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
          ) : orders.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold text-lg text-foreground">No Dispatch Orders Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Create a new commercial dispatch order to begin the Finished Goods picking and vehicle loading workflow.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Dispatch Order</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold text-xs">Order Number</TableHead>
                    <TableHead className="font-semibold text-xs">Customer & Destination</TableHead>
                    <TableHead className="font-semibold text-xs">Truck / Transporter</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Order Lines & Qty</TableHead>
                    <TableHead className="font-semibold text-xs">Fulfillment Progress</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const totalOrdered = order.totalQty;
                    const totalPicked = order.lines.reduce((acc, l) => acc + l.pickedQty, 0);
                    const totalLoaded = order.lines.reduce((acc, l) => acc + l.loadedQty, 0);

                    return (
                      <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          {order.orderNumber}
                          <div className="text-[10px] text-muted-foreground font-sans">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs text-foreground">
                            {order.customerName}
                          </div>
                          {order.customerAddress && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-xs">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{order.customerAddress}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-foreground font-medium">
                            {order.vehicleNumber || "No Truck Assigned"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {order.transporter || "Standard Logistics"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold text-xs text-foreground">
                            {totalOrdered.toLocaleString()} bags
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {order.lines.length} product line(s)
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Picked: {totalPicked}</span>
                              <span>Loaded: {totalLoaded}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                              <div
                                className="bg-blue-500 h-full"
                                style={{ width: `${Math.min(100, (totalPicked / (totalOrdered || 1)) * 100)}%` }}
                              />
                              <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${Math.min(100, (totalLoaded / (totalOrdered || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingOrder(order)}
                              className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Details</span>
                            </Button>

                            {order.status !== "DISPATCHED" && order.status !== "CANCELLED" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPickModal(order)}
                                  className="h-8 px-2.5 text-xs gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-950/40"
                                >
                                  <Boxes className="h-3.5 w-3.5" />
                                  <span>Pick</span>
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenLoadModal(order)}
                                  className="h-8 px-2.5 text-xs gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                  <span>Load</span>
                                </Button>
                              </>
                            )}
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

      {/* Dialog: Create Dispatch Order */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleCreateOrder}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <span>Create Commercial Dispatch Order</span>
              </DialogTitle>
              <DialogDescription>
                Initiate a new finished goods delivery order with customer specifications and bag requirements.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cust-name">Customer Name *</Label>
                  <Input
                    id="cust-name"
                    placeholder="e.g. UltraTech Cement / ABC Corp"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cust-contact">Contact Person / Phone</Label>
                  <Input
                    id="cust-contact"
                    placeholder="e.g. +91 98765 43210"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="cust-address">Delivery Destination Address</Label>
                  <Input
                    id="cust-address"
                    placeholder="e.g. Plant Site #4, Industrial Area, Raigad"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cust-truck">Vehicle / Truck Number</Label>
                  <Input
                    id="cust-truck"
                    placeholder="e.g. MH-12-AB-1234"
                    value={newVehicle}
                    onChange={(e) => setNewVehicle(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cust-trans">Transporter / Carrier</Label>
                  <Input
                    id="cust-trans"
                    placeholder="e.g. VRL Logistics"
                    value={newTransporter}
                    onChange={(e) => setNewTransporter(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cust-driver">Driver Name</Label>
                  <Input
                    id="cust-driver"
                    placeholder="Driver full name"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cust-gate">Link Gate Entry Truck (Optional)</Label>
                  <Select value={newGateEntryId} onValueChange={(val) => setNewGateEntryId(val || "")}>
                    <SelectTrigger id="cust-gate">
                      <SelectValue placeholder="Select gate entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {gateEntries.map((ge) => (
                        <SelectItem key={ge.id} value={ge.id}>
                          {ge.entryNumber} - {ge.truckNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Order Lines */}
              <div className="border rounded-xl p-4 bg-muted/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">Product Order Lines</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="h-8 gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item Line</span>
                  </Button>
                </div>

                {orderLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                    <div className="flex-1">
                      <Select
                        value={line.inventoryItemId}
                        onValueChange={(val) => handleLineChange(idx, "inventoryItemId", val || "")}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select finished bag product" />
                        </SelectTrigger>
                        <SelectContent>
                          {fgItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.code}) - Stock: {item.currentStock}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-28">
                      <Input
                        type="number"
                        placeholder="Quantity"
                        value={line.orderedQty}
                        onChange={(e) => handleLineChange(idx, "orderedQty", parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="w-20">
                      <Input
                        value={line.unit}
                        onChange={(e) => handleLineChange(idx, "unit", e.target.value)}
                        className="h-9 text-xs"
                        placeholder="bags"
                      />
                    </div>

                    {orderLines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLine(idx)}
                        className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="order-notes">Order Notes / Delivery Instructions</Label>
                <Textarea
                  id="order-notes"
                  placeholder="Special unloading instructions, invoice reference, etc."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={submittingCreate}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingCreate}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submittingCreate ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>{submittingCreate ? "Creating..." : "Create Order"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pick & Allocate Stock Lots */}
      <Dialog open={!!pickingOrder} onOpenChange={(open) => !open && setPickingOrder(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600" />
              <span>Pick & Allocate Stock: {pickingOrder?.orderNumber}</span>
            </DialogTitle>
            <DialogDescription>
              Select Finished Goods inventory lots to reserve and allocate for customer {pickingOrder?.customerName}.
            </DialogDescription>
          </DialogHeader>

          {pickingOrder && (
            <div className="flex flex-col gap-4 py-2">
              {pickingOrder.lines.map((line) => {
                const lots = availableLotsByLine[line.id] || [];
                const currentPicks = selectedLots[line.id] || [];

                return (
                  <div key={line.id} className="border rounded-xl p-4 bg-muted/20 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-foreground">
                          {line.inventoryItem?.name}
                        </span>
                        <div className="text-xs text-muted-foreground font-mono">
                          {line.inventoryItem?.code} | Required: {line.orderedQty} {line.unit} (Already Picked: {line.pickedQty})
                        </div>
                      </div>
                    </div>

                    {lots.length === 0 ? (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
                        No available FG lots in stock for this product. Please promote passed bales first.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {lots.map((lot) => {
                          const available = lot.quantity - lot.allocatedQty;
                          const existingPick = currentPicks.find((p) => p.lotId === lot.id);
                          const isAllocated = !!existingPick && existingPick.qty > 0;

                          return (
                            <div
                              key={lot.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                                isAllocated ? "bg-blue-500/10 border-blue-300 dark:border-blue-700" : "bg-background"
                              }`}
                            >
                              <div>
                                <span className="font-mono font-bold text-primary">{lot.lotNumber}</span>
                                <div className="text-[11px] text-muted-foreground">
                                  Batch: {lot.productionBatch || "—"} | Location: {lot.location?.name || "Warehouse"}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">
                                  Available: <strong className="text-foreground">{available}</strong>
                                </span>

                                <Input
                                  type="number"
                                  min={0}
                                  max={available}
                                  placeholder="Pick Qty"
                                  value={existingPick?.qty ?? ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const otherPicks = currentPicks.filter((p) => p.lotId !== lot.id);
                                    if (val > 0) {
                                      setSelectedLots({
                                        ...selectedLots,
                                        [line.id]: [...otherPicks, { lotId: lot.id, qty: val }],
                                      });
                                    } else {
                                      setSelectedLots({
                                        ...selectedLots,
                                        [line.id]: otherPicks,
                                      });
                                    }
                                  }}
                                  className="h-8 w-24 text-xs font-bold"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickingOrder(null)} disabled={submittingPick}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPick}
              disabled={submittingPick}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submittingPick ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>Confirm Stock Allocation</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Load & Dispatch Confirmation */}
      <Dialog open={!!loadingOrder} onOpenChange={(open) => !open && setLoadingOrder(null)}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              <span>Confirm Loading & Dispatch: {loadingOrder?.orderNumber}</span>
            </DialogTitle>
            <DialogDescription>
              Confirm vehicle loading and execute automatic inventory OUT transactions for customer {loadingOrder?.customerName}.
            </DialogDescription>
          </DialogHeader>

          {loadingOrder && (
            <div className="flex flex-col gap-4 py-2">
              <div className="border p-3 rounded-lg bg-muted/20 text-xs">
                <span className="font-semibold text-foreground block">Order Fulfillment Summary</span>
                <span className="text-muted-foreground block mt-0.5">
                  Total Allocated: {loadingOrder.lines.reduce((acc, l) => acc + l.pickedQty, 0)} / {loadingOrder.totalQty} bags across {loadingOrder.lines.length} lines.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="load-veh">Vehicle / Truck Number</Label>
                  <Input
                    id="load-veh"
                    value={loadVehicle}
                    onChange={(e) => setLoadVehicle(e.target.value)}
                    placeholder="e.g. MH-12-AB-1234"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="load-trans">Transporter</Label>
                  <Input
                    id="load-trans"
                    value={loadTransporter}
                    onChange={(e) => setLoadTransporter(e.target.value)}
                    placeholder="e.g. VRL Logistics"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="load-driver">Driver Name</Label>
                  <Input
                    id="load-driver"
                    value={loadDriverName}
                    onChange={(e) => setLoadDriverName(e.target.value)}
                    placeholder="Driver Name"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="load-driver-phone">Driver Phone</Label>
                  <Input
                    id="load-driver-phone"
                    value={loadDriverPhone}
                    onChange={(e) => setLoadDriverPhone(e.target.value)}
                    placeholder="+91 Phone"
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="load-gate">Gate Entry (Outbound Truck Tracking)</Label>
                  <Select value={loadGateEntryId} onValueChange={(val) => setLoadGateEntryId(val || "")}>
                    <SelectTrigger id="load-gate">
                      <SelectValue placeholder="Select gate entry" />
                    </SelectTrigger>
                    <SelectContent>
                      {gateEntries.map((ge) => (
                        <SelectItem key={ge.id} value={ge.id}>
                          {ge.entryNumber} - {ge.truckNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="load-notes">Dispatch Notes / Bilty #</Label>
                  <Textarea
                    id="load-notes"
                    value={loadNotes}
                    onChange={(e) => setLoadNotes(e.target.value)}
                    placeholder="Bilty number, invoice reference, container seal..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadingOrder(null)} disabled={submittingLoad}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmLoad}
              disabled={submittingLoad}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
            >
              {submittingLoad ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              <span>{submittingLoad ? "Processing..." : "Confirm & Post Inventory OUT"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Order Details View */}
      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <span>Dispatch Order: {viewingOrder?.orderNumber}</span>
            </DialogTitle>
            <DialogDescription>
              Full customer details, line item requirements, and allocated Finished Goods lots.
            </DialogDescription>
          </DialogHeader>

          {viewingOrder && (
            <div className="flex flex-col gap-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 border p-3 rounded-xl bg-muted/20">
                <div>
                  <span className="text-muted-foreground block">Customer:</span>
                  <span className="font-bold text-foreground text-sm">{viewingOrder.customerName}</span>
                  {viewingOrder.customerContact && (
                    <span className="text-muted-foreground block">{viewingOrder.customerContact}</span>
                  )}
                </div>

                <div>
                  <span className="text-muted-foreground block">Status / Date:</span>
                  <div className="mt-0.5">{getStatusBadge(viewingOrder.status)}</div>
                  <span className="text-muted-foreground block mt-1">
                    {new Date(viewingOrder.createdAt).toLocaleString()}
                  </span>
                </div>

                {viewingOrder.customerAddress && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">Destination Address:</span>
                    <span className="text-foreground">{viewingOrder.customerAddress}</span>
                  </div>
                )}

                <div>
                  <span className="text-muted-foreground block">Transporter / Vehicle:</span>
                  <span className="font-medium text-foreground">
                    {viewingOrder.vehicleNumber || "—"} ({viewingOrder.transporter || "Standard"})
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block">Driver:</span>
                  <span className="text-foreground">
                    {viewingOrder.driverName || "—"} {viewingOrder.driverPhone ? `(${viewingOrder.driverPhone})` : ""}
                  </span>
                </div>
              </div>

              {/* Lines & Allocations */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-sm text-foreground">Order Product Lines</span>
                {viewingOrder.lines.map((line) => (
                  <div key={line.id} className="border p-3 rounded-xl bg-card">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{line.inventoryItem?.name}</span>
                      <span className="font-bold text-primary">
                        {line.orderedQty} {line.unit}
                      </span>
                    </div>

                    {line.allocations && line.allocations.length > 0 && (
                      <div className="mt-2 pt-2 border-t flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Allocated Finished Goods Lots:
                        </span>
                        {line.allocations.map((alloc) => (
                          <div key={alloc.id} className="flex items-center justify-between bg-muted/40 p-1.5 rounded text-[11px]">
                            <span className="font-mono font-medium text-foreground">
                              {alloc.finishedGoodsLot?.lotNumber}
                            </span>
                            <span>Qty: <strong>{alloc.allocatedQty}</strong> (Loaded: {alloc.loadedQty})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingOrder(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
