"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingDown,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Flame,
  ShieldAlert,
  Cpu,
  UserCheck,
  Calendar,
  Layers,
  Settings,
  DollarSign,
  Activity,
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

interface MaintenanceLog {
  id: string;
  logNumber: string;
  machineId: string;
  type: "BREAKDOWN" | "PREVENTATIVE" | "ROUTINE_SERVICE" | "INSPECTION" | "CALIBRATION";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  title: string;
  description: string;
  downtimeMinutes: number;
  cost: number | null;
  reportedById: string | null;
  assignedTechnicianId: string | null;
  resolvedById: string | null;
  reportedAt: string;
  startedAt: string | null;
  resolvedAt: string | null;
  correctiveAction: string | null;
  partsReplaced: string | null;
  machine?: {
    id: string;
    name: string;
    serialNumber: string | null;
    status: string;
    section?: { id: string; name: string; code: string } | null;
  } | null;
  reportedBy?: { id: string; name: string; employeeId: string | null } | null;
  assignedTechnician?: { id: string; name: string; employeeId: string | null } | null;
  resolvedBy?: { id: string; name: string; employeeId: string | null } | null;
}

interface MaintenanceStats {
  totalLogs: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  criticalCount: number;
  totalDowntimeMinutes: number;
  todayDowntimeMinutes: number;
  monthDowntimeMinutes: number;
  totalMaintenanceCost: number;
  totalMachines: number;
  machinesInMaintenance: number;
  typeBreakdown: Record<string, number>;
  machineDowntimeBreakdown: Array<{
    machineName: string;
    sectionName: string;
    totalDowntime: number;
    ticketCount: number;
  }>;
}

export function MaintenanceClient() {
  const [activeTab, setActiveTab] = useState("logs");
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Machines & Technicians lists
  const [machines, setMachines] = useState<{ id: string; name: string; section?: { name: string } }[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; name: string; employeeId?: string }[]>([]);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [machineId, setMachineId] = useState("");
  const [type, setType] = useState<string>("BREAKDOWN");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [downtimeMinutes, setDowntimeMinutes] = useState<number | "">(0);
  const [cost, setCost] = useState<number | "">("");
  const [assignedTechnicianId, setAssignedTechnicianId] = useState("");

  // Resolve / Update Modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>("RESOLVED");
  const [updateDowntimeMinutes, setUpdateDowntimeMinutes] = useState<number | "">(0);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [updateCost, setUpdateCost] = useState<number | "">("");

  const [isPending, startTransition] = useTransition();

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        fetch("/api/maintenance/logs?limit=100"),
        fetch("/api/maintenance/stats"),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.data?.logs || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data?.stats || null);
      }
    } catch {
      toast.error("Failed to load maintenance data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [machinesRes, usersRes] = await Promise.all([
        fetch("/api/settings/master-data/machines?limit=100"),
        fetch("/api/users?limit=100"),
      ]);

      if (machinesRes.ok) {
        const data = await machinesRes.json();
        setMachines(data.data?.records || data.data || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setTechnicians(data.data?.users || data.data || []);
      }
    } catch {
      // Ignore non-critical fallback
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
    fetchMasterData();
  }, []);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) {
      toast.error("Please select a machine");
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in issue title and description");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/maintenance/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            machineId,
            type,
            priority,
            title,
            description,
            downtimeMinutes: downtimeMinutes ? Number(downtimeMinutes) : 0,
            cost: cost ? Number(cost) : undefined,
            assignedTechnicianId: assignedTechnicianId || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to create maintenance log");
        }

        toast.success(`Maintenance ticket ${json.data.logNumber} recorded!`);
        setCreateModalOpen(false);
        setMachineId("");
        setTitle("");
        setDescription("");
        setDowntimeMinutes(0);
        setCost("");
        fetchMaintenanceData();
      } catch (err: any) {
        toast.error(err.message || "Failed to create maintenance ticket");
      }
    });
  };

  const openUpdateModal = (log: MaintenanceLog) => {
    setSelectedLog(log);
    setUpdateStatus(log.status === "OPEN" ? "IN_PROGRESS" : "RESOLVED");
    setUpdateDowntimeMinutes(log.downtimeMinutes || 0);
    setCorrectiveAction(log.correctiveAction || "");
    setPartsReplaced(log.partsReplaced || "");
    setUpdateCost(log.cost || "");
    setUpdateModalOpen(true);
  };

  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/maintenance/logs/${selectedLog.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: updateStatus,
            downtimeMinutes: updateDowntimeMinutes ? Number(updateDowntimeMinutes) : 0,
            correctiveAction: correctiveAction || undefined,
            partsReplaced: partsReplaced || undefined,
            cost: updateCost ? Number(updateCost) : undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to update maintenance log");
        }

        toast.success(`Ticket ${selectedLog.logNumber} updated to ${updateStatus}!`);
        setUpdateModalOpen(false);
        setSelectedLog(null);
        fetchMaintenanceData();
      } catch (err: any) {
        toast.error(err.message || "Failed to update maintenance ticket");
      }
    });
  };

  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== "ALL" && log.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && log.type !== typeFilter) return false;
    if (priorityFilter !== "ALL" && log.priority !== priorityFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.logNumber.toLowerCase().includes(term) ||
      log.title.toLowerCase().includes(term) ||
      (log.machine?.name && log.machine.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Wrench className="h-7 w-7 text-indigo-600" />
              Machine Maintenance & Service
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track machine breakdown tickets, schedule preventative maintenance, log service downtime, and maintain plant reliability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMaintenanceData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Report Incident / Service
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Issues
            </span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {(stats?.openCount || 0) + (stats?.inProgressCount || 0)}
            </span>
            <span className="text-xs font-medium text-amber-600">
              ({stats?.inProgressCount || 0} in progress)
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {stats?.openCount || 0} open incidents pending assignment
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Critical / High Severity
            </span>
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600">
              {stats?.criticalCount || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">urgent</span>
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1">
            Requiring immediate technician response
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Downtime
            </span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.todayDowntimeMinutes || 0}
            </span>
            <span className="text-sm font-medium text-slate-500">min</span>
          </div>
          <p className="text-xs text-purple-600 font-medium mt-1">
            Month total: {stats?.monthDowntimeMinutes || 0} min
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Machines in Maintenance
            </span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.machinesInMaintenance || 0}
            </span>
            <span className="text-xs font-medium text-slate-400">
              / {stats?.totalMachines || 0} total
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Plant-wide active machine status
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <TabsList className="bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Wrench className="h-4 w-4" />
              Service & Breakdown Logs
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.2 text-[10px]">
                {logs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="machines" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Cpu className="h-4 w-4" />
              Machine Downtime Summary
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Activity className="h-4 w-4" />
              Type & Cost Analytics
            </TabsTrigger>
          </TabsList>

          {activeTab === "logs" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search ticket, machine..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 w-40 sm:w-56 text-xs bg-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="h-9 w-28 text-xs bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(val) => setPriorityFilter(val || "ALL")}>
                <SelectTrigger className="h-9 w-28 text-xs bg-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priority</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tab 1: Maintenance Logs Table */}
        <TabsContent value="logs" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Ticket #</th>
                    <th className="px-4 py-3">Machine</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Issue Summary</th>
                    <th className="px-4 py-3">Downtime</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        <Wrench className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-slate-600">No maintenance tickets found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Report breakdown incidents or schedule preventative maintenance.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 font-mono text-xs">
                          {log.logNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {log.machine?.name || "Machine"}
                          <div className="text-[11px] font-normal text-slate-400">
                            {log.machine?.section?.name || "Production"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs bg-slate-100 font-mono">
                            {log.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              log.priority === "CRITICAL"
                                ? "bg-rose-100 text-rose-800"
                                : log.priority === "HIGH"
                                ? "bg-orange-100 text-orange-800"
                                : log.priority === "MEDIUM"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {log.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-semibold text-slate-900">{log.title}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">{log.description}</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-purple-700">
                          {log.downtimeMinutes > 0 ? `${log.downtimeMinutes} min` : "0 min"}
                        </td>
                        <td className="px-4 py-3">
                          {log.status === "OPEN" && (
                            <Badge className="bg-rose-500 text-white flex items-center gap-1 w-fit text-xs">
                              <AlertTriangle className="h-3 w-3" /> Open
                            </Badge>
                          )}
                          {log.status === "IN_PROGRESS" && (
                            <Badge className="bg-amber-500 text-white flex items-center gap-1 w-fit text-xs">
                              <Clock className="h-3 w-3 animate-spin" /> In Progress
                            </Badge>
                          )}
                          {log.status === "RESOLVED" && (
                            <Badge className="bg-emerald-600 text-white flex items-center gap-1 w-fit text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Resolved
                            </Badge>
                          )}
                          {log.status === "CANCELLED" && (
                            <Badge variant="secondary" className="bg-slate-200 text-slate-600 w-fit text-xs">
                              Cancelled
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {log.assignedTechnician?.name || "Unassigned"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {log.status !== "RESOLVED" && log.status !== "CANCELLED" ? (
                            <Button
                              size="sm"
                              onClick={() => openUpdateModal(log)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3"
                            >
                              Update / Resolve
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">Closed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Machine Downtime Summary */}
        <TabsContent value="machines" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-semibold text-slate-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-600" />
              Machine-Wise Cumulative Downtime & Ticket Load
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Machine Name</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Cumulative Downtime</th>
                    <th className="px-4 py-3">Total Tickets</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.machineDowntimeBreakdown && stats.machineDowntimeBreakdown.length > 0 ? (
                    stats.machineDowntimeBreakdown.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{m.machineName}</td>
                        <td className="px-4 py-3 text-slate-600">{m.sectionName}</td>
                        <td className="px-4 py-3 font-bold text-purple-700">
                          {m.totalDowntime} min ({Math.round((m.totalDowntime / 60) * 10) / 10} hrs)
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{m.ticketCount} incidents</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="bg-slate-100">
                            Tracked
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-xs">
                        No machine downtime records logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Type & Cost Analytics */}
        <TabsContent value="breakdown" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                Maintenance Incidents by Category
              </h3>
              <div className="space-y-3">
                {stats?.typeBreakdown &&
                  Object.entries(stats.typeBreakdown).map(([typ, count]) => (
                    <div key={typ} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <span className="text-slate-600 font-mono text-xs">{typ}</span>
                      <Badge variant="secondary" className="font-semibold">
                        {count} tickets
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Maintenance Financial & Parts Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Total Recorded Repair Cost:</span>
                  <span className="font-bold text-emerald-600">
                    ${stats?.totalMaintenanceCost?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Resolved Incidents:</span>
                  <span className="font-bold text-slate-900">{stats?.resolvedCount || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-semibold text-slate-900">Total Downtime Logged:</span>
                  <span className="font-bold text-purple-700">
                    {stats?.totalDowntimeMinutes || 0} min
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Report Incident / Schedule Service */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Wrench className="h-5 w-5 text-indigo-600" />
              Report Incident / Service Ticket
            </DialogTitle>
            <DialogDescription>
              Log machine breakdowns, emergency repairs, or schedule routine maintenance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateLog} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Target Machine *</Label>
              <Select value={machineId} onValueChange={(val) => setMachineId(val || "")}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.section?.name || "General"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Maintenance Type</Label>
                <Select value={type} onValueChange={(val) => setType(val || "BREAKDOWN")}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAKDOWN">BREAKDOWN (Emergency)</SelectItem>
                    <SelectItem value="PREVENTATIVE">PREVENTATIVE</SelectItem>
                    <SelectItem value="ROUTINE_SERVICE">ROUTINE_SERVICE</SelectItem>
                    <SelectItem value="INSPECTION">INSPECTION</SelectItem>
                    <SelectItem value="CALIBRATION">CALIBRATION</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={priority} onValueChange={(val) => setPriority(val || "MEDIUM")}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">CRITICAL (Line stopped)</SelectItem>
                    <SelectItem value="HIGH">HIGH (Degraded run)</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM (Standard)</SelectItem>
                    <SelectItem value="LOW">LOW (Minor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Issue Summary / Title *</Label>
              <Input
                required
                placeholder="e.g. Loom 04 Main Motor Bearing Noise"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Detailed Description *</Label>
              <Textarea
                required
                placeholder="Observed symptoms, error codes, abnormal vibration..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Estimated Downtime (min)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={downtimeMinutes}
                  onChange={(e) => setDowntimeMinutes(e.target.value ? Number(e.target.value) : "")}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Assign Technician</Label>
                <Select value={assignedTechnicianId} onValueChange={(val) => setAssignedTechnicianId(val || "")}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Assign technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isPending ? "Logging..." : "Create Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Update / Resolve Incident */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Update / Resolve Maintenance Ticket
            </DialogTitle>
            <DialogDescription>
              Record corrective repair actions, downtime duration, parts replaced, and resolve ticket.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <form onSubmit={handleUpdateLog} className="space-y-4 mt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-900">{selectedLog.logNumber}</span>
                  <Badge variant="outline">{selectedLog.type}</Badge>
                </div>
                <div className="text-slate-600 font-medium">{selectedLog.title}</div>
                <div className="text-slate-400 mt-1">Machine: {selectedLog.machine?.name}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Ticket Status</Label>
                <Select value={updateStatus} onValueChange={(val) => setUpdateStatus(val || "RESOLVED")}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_PROGRESS">In Progress (Work ongoing)</SelectItem>
                    <SelectItem value="RESOLVED">Resolved (Repairs complete)</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled (False alarm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Total Downtime (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={updateDowntimeMinutes}
                  onChange={(e) =>
                    setUpdateDowntimeMinutes(e.target.value ? Number(e.target.value) : "")
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Corrective Action Taken</Label>
                <Textarea
                  placeholder="Replaced worn bearing, aligned pulleys, re-lubricated gearbox..."
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  className="text-xs"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Parts Replaced</Label>
                <Input
                  placeholder="e.g. 2x SKF 6205 Bearings, 1x V-Belt B-52"
                  value={partsReplaced}
                  onChange={(e) => setPartsReplaced(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Total Repair Cost ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 150.00"
                  value={updateCost}
                  onChange={(e) => setUpdateCost(e.target.value ? Number(e.target.value) : "")}
                  className="text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUpdateModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  {isPending ? "Saving..." : "Save & Update Ticket"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
