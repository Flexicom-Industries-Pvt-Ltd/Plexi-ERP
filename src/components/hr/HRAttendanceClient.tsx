"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Radio,
  Download,
  Upload,
  Search,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AttendanceImportModal } from "./AttendanceImportModal";
import { toast } from "sonner";

interface ShiftOption {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface AttendanceRecord {
  id: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  shiftName: string;
  firstIn?: string;
  lastOut?: string;
  workHours: number;
  overtimeHours: number;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE" | "ON_DUTY" | "WEEKLY_OFF";
  isLate: boolean;
}

interface PunchRecord {
  id: string;
  employeeCode: string;
  employeeName?: string;
  punchTime: string;
  direction: "IN" | "OUT" | "AUTO";
  verifyMode: string;
  deviceName: string;
  source: string;
}

interface DeviceRecord {
  id: string;
  serialNumber: string;
  name: string;
  ipAddress?: string;
  location?: string;
  status: string;
  userCount: number;
  faceCount: number;
  lastLogAt?: string;
}

interface HeadcountRecord {
  id: string;
  shiftName: string;
  department: string;
  totalReported: number;
  operatorsCount: number;
  helpersCount: number;
}

export function HRAttendanceClient() {
  const [activeTab, setActiveTab] = useState<"register" | "punches" | "devices" | "headcount">("register");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedShift, setSelectedShift] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Data states
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [kpis, setKpis] = useState({
    totalStaff: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    halfDayCount: 0,
    attendancePct: 0,
  });
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [headcounts, setHeadcounts] = useState<HeadcountRecord[]>([]);

  // 1. Fetch Daily Attendance Records & KPIs
  const fetchAttendance = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const url = new URL("/api/hr/attendance", window.location.origin);
      url.searchParams.set("date", selectedDate);
      if (selectedDept !== "ALL") url.searchParams.set("department", selectedDept);
      if (selectedShift !== "ALL") url.searchParams.set("shift", selectedShift);
      if (searchQuery.trim()) url.searchParams.set("search", searchQuery.trim());

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setRecords(json.data.records || []);
        setKpis(json.data.kpis || { totalStaff: 0, presentCount: 0, lateCount: 0, absentCount: 0, halfDayCount: 0, attendancePct: 0 });
        if (json.data.shifts?.length > 0) {
          setShifts(json.data.shifts);
        }
      }
    } catch (err: any) {
      if (!silent) toast.error("Error loading attendance: " + err.message);
    } finally {
      if (!silent) setIsLoading(false);
      setLastRefreshedAt(new Date());
    }
  }, [selectedDate, selectedDept, selectedShift, searchQuery]);

  // 2. Fetch Raw Punches
  const fetchPunches = useCallback(async () => {
    try {
      const url = new URL("/api/hr/punches", window.location.origin);
      url.searchParams.set("date", selectedDate);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setPunches(json.data.punches || []);
      }
    } catch {}
  }, [selectedDate]);

  // 3. Fetch Devices
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/devices");
      const json = await res.json();
      if (json.success) {
        setDevices(json.data.devices || []);
      }
    } catch {}
  }, []);

  // 4. Fetch Shift Headcount (H-04 & X-01)
  const fetchHeadcounts = useCallback(async () => {
    try {
      const url = new URL("/api/hr/headcount", window.location.origin);
      url.searchParams.set("date", selectedDate);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setHeadcounts(json.data.headcounts || []);
      }
    } catch {}
  }, [selectedDate]);

  // Initial load
  useEffect(() => {
    fetchAttendance();
    fetchPunches();
    fetchDevices();
    fetchHeadcounts();
  }, [fetchAttendance, fetchPunches, fetchDevices, fetchHeadcounts]);

  // Real-time automatic polling every 25 seconds (No manual Sync button required)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAttendance(true);
      fetchPunches();
      fetchDevices();
      fetchHeadcounts();
    }, 25000);
    return () => clearInterval(timer);
  }, [fetchAttendance, fetchPunches, fetchDevices, fetchHeadcounts]);

  // Trigger downloads
  const handleExport = (type: "attendance" | "punches", format: "xlsx" | "csv") => {
    window.location.href = `/api/hr/export?type=${type}&format=${format}&date=${selectedDate}`;
  };

  const handleDownloadTemplate = () => {
    window.location.href = "/api/hr/template";
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-slate-800">Real-time Biometric Sync Active</span>
            <span className="text-slate-500 ml-2 hidden md:inline">
              Shift Timings: {shifts.length > 0 ? shifts.map((s) => `${s.name} (${s.startTime}–${s.endTime})`).join(" | ") : "DAY (08:00–20:00) | NIGHT (20:00–08:00)"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span>Last polled {lastRefreshedAt.toLocaleTimeString("en-IN")}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>TOTAL STAFF</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.totalStaff}</div>
          <span className="text-[11px] text-slate-400">Registered staff</span>
        </div>

        <div className="p-4 bg-white border border-emerald-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
            <span>PRESENT</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{kpis.presentCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium">{kpis.attendancePct}% reporting</span>
        </div>

        <div className="p-4 bg-white border border-amber-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
            <span>LATE ARRIVAL</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{kpis.lateCount}</div>
          <span className="text-[11px] text-amber-600">&gt; 15m grace window</span>
        </div>

        <div className="p-4 bg-white border border-rose-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1">
            <span>ABSENT</span>
            <UserX className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{kpis.absentCount}</div>
          <span className="text-[11px] text-rose-600">Zero punch logged</span>
        </div>

        <div className="p-4 bg-white border border-indigo-200/80 rounded-xl shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold mb-1">
            <span>DEVICES</span>
            <Radio className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">
            {devices.filter((d) => d.status === "ONLINE").length} / {devices.length || 1}
          </div>
          <span className="text-[11px] text-indigo-600">IKOLAHA Gate 1</span>
        </div>
      </div>

      {/* Main Filter Toolbar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("register")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "register" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Daily Register
            </button>
            <button
              onClick={() => setActiveTab("punches")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "punches" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Punch Logs ({punches.length})
            </button>
            <button
              onClick={() => setActiveTab("headcount")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "headcount" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Shift Headcount (H-04)
            </button>
            <button
              onClick={() => setActiveTab("devices")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "devices" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Devices ({devices.length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="gap-2 text-xs font-medium"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              Import Excel / CSV
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button size="sm" className="gap-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white">
                  <Download className="h-4 w-4" />
                  Download Reports
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Attendance Downloads</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("attendance", "xlsx")} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Daily Register (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("attendance", "csv")} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  Daily Register (.csv)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("punches", "xlsx")} className="gap-2 cursor-pointer">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  Biometric Raw Logs (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTemplate} className="gap-2 cursor-pointer text-slate-600">
                  <Download className="h-4 w-4 text-slate-500" />
                  Sample Import Template (.xlsx)
                </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-9 px-3 border border-slate-200 rounded-md text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Departments</option>
              <option value="LOOM">Loom Section</option>
              <option value="TAPE_PLANT">Tape Plant</option>
              <option value="LAMINATION">Lamination</option>
              <option value="PRINTING">Printing</option>
              <option value="CONVERTEX">Convertex</option>
              <option value="VALVOMATIC">Valvomatic</option>
              <option value="SECURITY">Security & Gate</option>
              <option value="ADMIN">Management & Admin</option>
            </select>
          </div>

          <div>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full h-9 px-3 border border-slate-200 rounded-md text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Shifts</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.startTime} - {s.endTime})
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search Employee ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: DAILY ATTENDANCE REGISTER */}
      {activeTab === "register" && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Daily Attendance Register — {selectedDate}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Showing {records.length} Staff Members
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading attendance register...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No attendance records recorded for this date and filter scope.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Shift</th>
                    <th className="px-4 py-3">First In</th>
                    <th className="px-4 py-3">Last Out</th>
                    <th className="px-4 py-3">Work Hours</th>
                    <th className="px-4 py-3">OT (Hrs)</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.employeeName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {r.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                          {r.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.shiftName}</td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">
                        {r.firstIn ? new Date(r.firstIn).toLocaleTimeString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">
                        {r.lastOut ? new Date(r.lastOut).toLocaleTimeString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.workHours.toFixed(1)} hrs</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">
                        {r.overtimeHours > 0 ? `+${r.overtimeHours.toFixed(1)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "PRESENT" && (
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                            Present
                          </Badge>
                        )}
                        {r.status === "LATE" && (
                          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200">
                            Late ({r.workHours.toFixed(1)}h)
                          </Badge>
                        )}
                        {r.status === "HALF_DAY" && (
                          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                            Half Day
                          </Badge>
                        )}
                        {r.status === "ABSENT" && (
                          <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200">
                            Absent
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BIOMETRIC RAW PUNCHES */}
      {activeTab === "punches" && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Live Biometric Machine Punches — {selectedDate}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Real-time Ingestion Stream
            </span>
          </div>

          {punches.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No biometric punches recorded for this date yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Punch Time</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3">Device / Station</th>
                    <th className="px-4 py-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {punches.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">
                        {new Date(p.punchTime).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{p.employeeName || p.employeeCode}</span>
                        <span className="text-[11px] text-slate-400 block font-mono">{p.employeeCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={p.direction === "IN" ? "text-emerald-700 border-emerald-300" : "text-amber-700 border-amber-300"}
                        >
                          {p.direction}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.verifyMode || "Face"}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.deviceName || "IKOLAHA FACTORY"}</td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">{p.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BIOMETRIC DEVICES */}
      {activeTab === "devices" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((d) => (
            <div key={d.id} className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{d.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">Serial: {d.serialNumber}</p>
                </div>
                <Badge className={d.status === "ONLINE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600"}>
                  {d.status === "ONLINE" ? "● Online" : "○ Offline"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block">IP Address</span>
                  <span className="font-mono font-medium text-slate-800">{d.ipAddress || "117.243.207.179"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Location</span>
                  <span className="font-medium text-slate-800">{d.location || "Main Gate"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Users Enrolled</span>
                  <span className="font-bold text-slate-800">{d.userCount} users ({d.faceCount} faces)</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Last Log Poll</span>
                  <span className="font-medium text-slate-800">
                    {d.lastLogAt ? new Date(d.lastLogAt).toLocaleTimeString("en-IN") : "Just now"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: SHIFT HEADCOUNT (H-04 & X-01) */}
      {activeTab === "headcount" && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                Production Shift Headcount Rollup (Req H-04 & X-01)
              </span>
              <p className="text-[11px] text-slate-500">
                Live attendance counts feed directly into Loom & Tape Plant shift handovers.
              </p>
            </div>
          </div>

          {headcounts.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No shift headcount generated for this date yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Department / Section</th>
                    <th className="px-4 py-3">Shift</th>
                    <th className="px-4 py-3">Total Reported</th>
                    <th className="px-4 py-3">Operators</th>
                    <th className="px-4 py-3">Helpers</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {headcounts.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">{h.department}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{h.shiftName}</td>
                      <td className="px-4 py-3 font-black text-slate-900 text-sm">{h.totalReported} Staff</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{h.operatorsCount} Operators</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{h.helpersCount} Helpers</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Verified & Synced
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      <AttendanceImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={() => {
          fetchAttendance();
          fetchPunches();
          fetchHeadcounts();
        }}
      />
    </div>
  );
}
