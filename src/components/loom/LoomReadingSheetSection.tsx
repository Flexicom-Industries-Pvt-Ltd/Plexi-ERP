import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calendar,
  Clock,
  Printer,
  FileSpreadsheet,
  Save,
  RotateCcw,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Filter,
  Check,
  X,
  Gauge,
  Timer,
  Send,
  CloudCheck,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Camera,
  Image as ImageIcon,
  Lock,
  Unlock,
  Info,
} from "lucide-react";
import {
  LoomReadingEntryItem,
  computeIntervalDeltas,
  computeLoomEfficiency,
  isLoomActive,
  LOOM_BREAKDOWN_REASONS,
  IntervalKpiSummary,
} from "@/lib/loom/loom-reading-types";
import { exportLoomReadingSheetExcel } from "@/lib/loom/loom-reading-export";
import { printLoomReadingSheet } from "@/lib/loom/print-loom-reading";
import { LoomReadingPrintPreviewModal } from "./LoomReadingPrintPreviewModal";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";
import { PhotoEvidenceModal } from "@/components/tape-plant/PhotoEvidenceModal";
import { isTimeSlotLocked } from "@/lib/tape-plant/telemetry-time-slots";

interface AvailableShift {
  id: string;
  name: string;
}

interface AvailableOperator {
  id: string;
  name: string;
  employeeCode?: string | null;
  section?: string | null;
  designation?: string | null;
}

interface AvailableQuality {
  code: string;
  colorGroup?: string | null;
  colour?: string | null;
  denier?: number | null;
  reedSpaceCm?: number | null;
  size?: string | null;
}

interface ReadingSheetData {
  sheet: {
    id: string | null;
    date: string;
    shiftName: string;
    shiftId: string | null;
    shiftHours: number;
    timeSlots: string[];
    initialTimeSlot: string;
    preparedBy: string;
    checkedBy: string;
    approvedBy: string;
    totalLoomProductionMeters: number;
    totalLoomProductionKg: number;
    totalWastageKg: number;
    runningLoomsCount: number;
    idleLoomsCount: number;
    averageEfficiency?: number;
    totalBreakdownMins?: number;
    remarks: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  };
  entries: LoomReadingEntryItem[];
  allEntriesCount: number;
  kpis: {
    totalLooms: number;
    runningLoomsCount: number;
    idleLoomsCount: number;
    totalShiftMeters: number;
    totalShiftKg: number;
    totalWastageKg: number;
    averageEfficiency?: number;
    totalBreakdownMins?: number;
    intervalTotals: IntervalKpiSummary[];
  };
  availableShifts: AvailableShift[];
  availableOperators: AvailableOperator[];
  availableQualities: AvailableQuality[];
}

export function LoomReadingSheetSection() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("loom_reading_selected_date") || new Date().toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedShift, setSelectedShift] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("loom_reading_selected_shift") || "DAY";
    }
    return "DAY";
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [autoSaving, setAutoSaving] = useState<boolean>(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const lastSavedPayloadRef = useRef<string>("");
  const latestPayloadRef = useRef<any>(null);
  const isInitialMountRef = useRef<boolean>(true);

  const [data, setData] = useState<ReadingSheetData | null>(null);
  const [entries, setEntries] = useState<LoomReadingEntryItem[]>([]);
  const [preparedBy, setPreparedBy] = useState<string>("");
  const [checkedBy, setCheckedBy] = useState<string>("");
  const [approvedBy, setApprovedBy] = useState<string>("");
  const [totalWastageKg, setTotalWastageKg] = useState<string>("0");
  const [sheetRemarks, setSheetRemarks] = useState<string>("");
  const [sheetStatus, setSheetStatus] = useState<string>("DRAFT");

  // Filters & Search - Default to active looms as requested
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
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
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false);
  const [bulkStartLoom, setBulkStartLoom] = useState<string>("31");
  const [bulkEndLoom, setBulkEndLoom] = useState<string>("34");
  const [bulkOperator, setBulkOperator] = useState<string>("");
  const [bulkQuality, setBulkQuality] = useState<string>("");
  const [bulkSize, setBulkSize] = useState<string>("");
  const [bulkDenier, setBulkDenier] = useState<string>("");

  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Mobile Accordion state for Loom Cards
  const [expandedLooms, setExpandedLooms] = useState<Set<string>>(new Set());

  const toggleExpandLoom = (key: string) => {
    setExpandedLooms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAllLooms = () => {
    const allKeys = new Set(filteredEntries.map((e) => `${e.loomNumber}-${e.rowSequence || 1}`));
    setExpandedLooms(allKeys);
  };

  const collapseAllLooms = () => {
    setExpandedLooms(new Set());
  };

  // Auth & RBAC State (Time Slot Unlock & Camera vs Upload)
  const [canUploadPhoto, setCanUploadPhoto] = useState<boolean>(true);
  const [canCapturePhoto, setCanCapturePhoto] = useState<boolean>(true);
  const [canUnlockTimeSlots, setCanUnlockTimeSlots] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>("");
  const [unlockedSlots, setUnlockedSlots] = useState<Set<string>>(new Set());
  const [photoModalEntry, setPhotoModalEntry] = useState<LoomReadingEntryItem | null>(null);

  const refreshUserPermissions = useCallback(() => {
    fetch("/api/auth/session", { cache: "no-store", headers: { Pragma: "no-cache", "Cache-Control": "no-cache" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!session?.user) return;
        setUserRole(session.user.role || "");
        setCanUploadPhoto(Boolean(session.user.canUploadPhoto));
        setCanCapturePhoto(session.user.canCapturePhoto !== undefined ? Boolean(session.user.canCapturePhoto) : true);
        setCanUnlockTimeSlots(Boolean(session.user.canUnlockTimeSlots));
      })
      .catch((err) => {
        console.warn("Could not determine user session for RBAC:", err);
      });
  }, []);

  useEffect(() => {
    refreshUserPermissions();
  }, [refreshUserPermissions]);

  useEffect(() => {
    if (photoModalEntry) {
      refreshUserPermissions();
    }
  }, [photoModalEntry, refreshUserPermissions]);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Persist selected date & shift to localStorage
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (typeof window !== "undefined") {
      localStorage.setItem("loom_reading_selected_date", newDate);
    }
  };

  const handleShiftChange = (newShift: string) => {
    setSelectedShift(newShift);
    if (typeof window !== "undefined") {
      localStorage.setItem("loom_reading_selected_shift", newShift);
    }
  };

  // Fetch sheet data from server
  const fetchSheetData = useCallback(async (date: string, shift: string) => {
    setLoading(true);
    isInitialMountRef.current = true;
    try {
      const params = new URLSearchParams({
        date,
        shiftName: shift,
      });
      const res = await fetch(`/api/production/loom/reading-sheet?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch loom reading sheet");
      const json: ReadingSheetData = await res.json();
      setData(json);

      // Sync shift name if backend resolved a canonical shift
      if (json.sheet?.shiftName && json.sheet.shiftName !== shift) {
        setSelectedShift(json.sheet.shiftName);
        if (typeof window !== "undefined") {
          localStorage.setItem("loom_reading_selected_shift", json.sheet.shiftName);
        }
      }

      const computedEntries = (json.entries || []).map((entry) => {
        const { r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod, totalProduction } = computeIntervalDeltas(entry);
        const bdMinutes = Number(entry.breakdownMinutes) || 0;
        const eff = computeLoomEfficiency(
          totalProduction,
          entry.qualityType,
          bdMinutes,
          json.sheet?.shiftHours || 12
        );
        return {
          ...entry,
          r1Prod,
          r2Prod,
          r3Prod,
          r4Prod,
          r5Prod,
          r6Prod,
          totalProduction,
          efficiencyPct: eff.efficiencyPct,
        };
      });

      setEntries(computedEntries);
      setPreparedBy(json.sheet?.preparedBy || "");
      setCheckedBy(json.sheet?.checkedBy || "");
      setApprovedBy(json.sheet?.approvedBy || "");
      setTotalWastageKg(String(json.sheet?.totalWastageKg || 0));
      setSheetRemarks(json.sheet?.remarks || "");
      setSheetStatus(json.sheet?.status || "DRAFT");

      const initialPayload = {
        action: "SAVE_SHEET",
        date,
        shiftName: json.sheet?.shiftName || shift,
        entries: computedEntries,
        preparedBy: json.sheet?.preparedBy || "",
        checkedBy: json.sheet?.checkedBy || "",
        approvedBy: json.sheet?.approvedBy || "",
        totalWastageKg: parseFloat(String(json.sheet?.totalWastageKg || 0)) || 0,
        remarks: json.sheet?.remarks || "",
        status: json.sheet?.status || "DRAFT",
        shiftHours: json.sheet?.shiftHours || 12,
        timeSlots: json.sheet?.timeSlots,
        initialTimeSlot: json.sheet?.initialTimeSlot,
      };
      latestPayloadRef.current = initialPayload;
      lastSavedPayloadRef.current = JSON.stringify(initialPayload);
      isInitialMountRef.current = false;
    } catch (err: any) {
      console.error("fetchSheetData error:", err);
      showNotification(err.message || "Failed to load reading sheet", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSheetData(selectedDate, selectedShift);
  }, [selectedDate, selectedShift, fetchSheetData]);

  // Immediate or debounced auto-save function with in-flight queuing
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<string | null>(null);
  const triggerAutoSaveRef = useRef<((isImmediate?: boolean, keepalive?: boolean) => Promise<void>) | null>(null);

  const triggerAutoSave = useCallback(async (isImmediate: boolean = false, keepalive: boolean = false) => {
    if (!latestPayloadRef.current || isInitialMountRef.current) return;
    const serialized = JSON.stringify(latestPayloadRef.current);
    if (serialized === lastSavedPayloadRef.current) return;

    if (isSavingRef.current) {
      pendingSaveRef.current = serialized;
      return;
    }

    isSavingRef.current = true;
    if (!isImmediate) {
      setAutoSaving(true);
    }

    try {
      const res = await fetch("/api/production/loom/reading-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serialized,
        keepalive,
      });

      if (res.ok) {
        lastSavedPayloadRef.current = serialized;
        setLastAutoSavedAt(new Date());
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      isSavingRef.current = false;
      if (!isImmediate) {
        setAutoSaving(false);
      }
      if (pendingSaveRef.current && pendingSaveRef.current !== lastSavedPayloadRef.current) {
        pendingSaveRef.current = null;
        triggerAutoSaveRef.current?.(false);
      }
    }
  }, []);
  useEffect(() => {
    triggerAutoSaveRef.current = triggerAutoSave;
  }, [triggerAutoSave]);

  // Sync latestPayloadRef and debounce auto-save (400ms)
  useEffect(() => {
    if (loading || isInitialMountRef.current || !data || entries.length === 0) return;

    const payload = {
      action: "SAVE_SHEET",
      date: selectedDate,
      shiftName: selectedShift,
      entries,
      preparedBy,
      checkedBy,
      approvedBy,
      totalWastageKg: parseFloat(totalWastageKg) || 0,
      remarks: sheetRemarks,
      status: sheetStatus,
      shiftHours: data?.sheet?.shiftHours || 12,
      timeSlots: data?.sheet?.timeSlots,
      initialTimeSlot: data?.sheet?.initialTimeSlot,
    };

    latestPayloadRef.current = payload;
    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedPayloadRef.current) return;

    const timer = setTimeout(() => {
      triggerAutoSave(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [
    entries,
    selectedDate,
    selectedShift,
    preparedBy,
    checkedBy,
    approvedBy,
    totalWastageKg,
    sheetRemarks,
    sheetStatus,
    loading,
    data,
    triggerAutoSave,
  ]);

  // Immediate flush on page reload, tab close, or navigation hide
  useEffect(() => {
    const handleUnloadOrHide = () => {
      if (latestPayloadRef.current && !isInitialMountRef.current) {
        const serialized = JSON.stringify(latestPayloadRef.current);
        if (serialized !== lastSavedPayloadRef.current) {
          fetch("/api/production/loom/reading-sheet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: serialized,
            keepalive: true,
          }).catch(() => {});
          lastSavedPayloadRef.current = serialized;
        }
      }
    };

    window.addEventListener("beforeunload", handleUnloadOrHide);
    window.addEventListener("pagehide", handleUnloadOrHide);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        handleUnloadOrHide();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleUnloadOrHide);
      window.removeEventListener("pagehide", handleUnloadOrHide);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Handle live reading and breakdown changes with instant recalculation
  const handleEntryChange = (
    loomNumber: number,
    rowSequence: number = 1,
    field: keyof LoomReadingEntryItem,
    value: any
  ) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.loomNumber !== loomNumber || (item.rowSequence || 1) !== (rowSequence || 1)) {
          return item;
        }

        const updated: LoomReadingEntryItem = {
          ...item,
          [field]: value,
        };

        // Recalculate deltas if any reading field changed
        if (
          field === "initialReading" ||
          field === "r1Reading" ||
          field === "r2Reading" ||
          field === "r3Reading" ||
          field === "r4Reading" ||
          field === "r5Reading" ||
          field === "r6Reading"
        ) {
          const { r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod, totalProduction } = computeIntervalDeltas(updated);
          updated.r1Prod = r1Prod;
          updated.r2Prod = r2Prod;
          updated.r3Prod = r3Prod;
          updated.r4Prod = r4Prod;
          updated.r5Prod = r5Prod;
          updated.r6Prod = r6Prod;
          updated.totalProduction = totalProduction;

          if (totalProduction > 0 && updated.status === "IDLE") {
            updated.status = "RUNNING";
          }
        }

        // If breakdownReason changed
        if (field === "breakdownReason") {
          if (value === "Change Over") {
            if (updated.status === "RUNNING") {
              updated.status = "CHANGEOVER";
            }
          } else if (item.breakdownReason === "Change Over") {
            updated.changeoverTargetQuality = null;
            if (updated.status === "CHANGEOVER") {
              updated.status = "RUNNING";
            }
          }
        }

        // Auto-fetch Size and Denier when qualityType changes
        if (field === "qualityType") {
          const rawQ = String(value || "").trim().toLowerCase();
          const foundQ = (data?.availableQualities || []).find(
            (q) => q.code.toLowerCase().trim() === rawQ
          );
          if (foundQ) {
            if (foundQ.size) {
              updated.size = foundQ.size;
            } else if (foundQ.reedSpaceCm) {
              updated.size = String(foundQ.reedSpaceCm * 10);
            }
            if (foundQ.denier) {
              updated.denier = String(foundQ.denier);
            }
          }
        }

        // Live calculate efficiency whenever meters, quality, or breakdown minutes change
        const bdMinutes = Number(updated.breakdownMinutes) || 0;
        const eff = computeLoomEfficiency(
          updated.totalProduction || 0,
          updated.qualityType,
          bdMinutes,
          data?.sheet?.shiftHours || 12
        );
        updated.efficiencyPct = eff.efficiencyPct;

        return updated;
      })
    );
  };

  // Add a new quality change split row for the specified loom
  const handleAddSplitRow = (loomNumber: number) => {
    setEntries((prev) => {
      const loomRows = prev.filter((e) => e.loomNumber === loomNumber);
      const maxSeq = Math.max(...loomRows.map((e) => e.rowSequence || 1), 1);
      const lastRow = loomRows[loomRows.length - 1];

      const lastReading =
        lastRow.r6Reading ??
        lastRow.r5Reading ??
        lastRow.r4Reading ??
        lastRow.r3Reading ??
        lastRow.r2Reading ??
        lastRow.r1Reading ??
        lastRow.initialReading ??
        null;

      const targetQuality = lastRow.changeoverTargetQuality || "";
      const targetQObj = (data?.availableQualities || []).find(
        (q) => q.code.toLowerCase().trim() === targetQuality.toLowerCase().trim()
      );

      const newRow: LoomReadingEntryItem = {
        loomNumber,
        rowSequence: maxSeq + 1,
        operatorName: lastRow.operatorName,
        size: targetQObj?.size || (targetQObj?.reedSpaceCm ? String(targetQObj.reedSpaceCm * 10) : lastRow.size),
        denier: targetQObj?.denier ? String(targetQObj.denier) : lastRow.denier,
        qualityType: targetQuality || "",
        initialReading: lastReading,
        r1Reading: null,
        r1Prod: null,
        r2Reading: null,
        r2Prod: null,
        r3Reading: null,
        r3Prod: null,
        r4Reading: null,
        r4Prod: null,
        r5Reading: null,
        r5Prod: null,
        r6Reading: null,
        r6Prod: null,
        totalProduction: 0,
        breakdownReason: null,
        breakdownMinutes: 0,
        changeoverTargetQuality: null,
        efficiencyPct: 0,
        status: "RUNNING",
        remarks: targetQuality ? `Changeover to ${targetQuality}` : "Quality Change",
      };

      const lastIdx = prev.findLastIndex((e) => e.loomNumber === loomNumber);
      const updated = [...prev];
      updated.splice(lastIdx + 1, 0, newRow);
      return updated;
    });

    showNotification(`Added quality change split row for Loom #${loomNumber}`);
    triggerAutoSave(true);
  };

  // Remove a split row for the specified loom
  const handleRemoveSplitRow = (loomNumber: number, rowSequence: number) => {
    if (rowSequence <= 1) return;
    setEntries((prev) =>
      prev.filter((e) => !(e.loomNumber === loomNumber && (e.rowSequence || 1) === rowSequence))
    );
    showNotification(`Removed split row for Loom #${loomNumber}`);
    triggerAutoSave(true);
  };

  // Live Calculated KPIs
  const timeSlots = data?.sheet?.timeSlots || ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"];
  const initialTimeSlot = data?.sheet?.initialTimeSlot || "08:00";

  const liveTotals = useMemo(() => {
    const totalR1Prod = entries.reduce((s, e) => s + (e.r1Prod || 0), 0);
    const totalR2Prod = entries.reduce((s, e) => s + (e.r2Prod || 0), 0);
    const totalR3Prod = entries.reduce((s, e) => s + (e.r3Prod || 0), 0);
    const totalR4Prod = entries.reduce((s, e) => s + (e.r4Prod || 0), 0);
    const totalR5Prod = entries.reduce((s, e) => s + (e.r5Prod || 0), 0);
    const totalR6Prod = entries.reduce((s, e) => s + (e.r6Prod || 0), 0);
    const totalShiftMeters = entries.reduce((s, e) => s + (e.totalProduction || 0), 0);
    const totalShiftKg = Math.round(totalShiftMeters * 0.16 * 100) / 100;
    const totalBreakdownMins = entries.reduce((s, e) => s + (Number(e.breakdownMinutes) || 0), 0);

    const runningEntries = entries.filter((e) => isLoomActive(e));
    const runningLooms = runningEntries.length;
    const idleLooms = entries.length - runningLooms;

    const effValues = runningEntries
      .map((e) => e.efficiencyPct || 0)
      .filter((v) => v > 0);
    const averageEfficiency = effValues.length > 0
      ? Math.round((effValues.reduce((a, b) => a + b, 0) / effValues.length) * 10) / 10
      : 0;

    const prog1 = totalR1Prod;
    const prog2 = prog1 + totalR2Prod;
    const prog3 = prog2 + totalR3Prod;
    const prog4 = prog3 + totalR4Prod;
    const prog5 = prog4 + totalR5Prod;
    const prog6 = prog5 + totalR6Prod;

    return {
      totalR1Prod,
      totalR2Prod,
      totalR3Prod,
      totalR4Prod,
      totalR5Prod,
      totalR6Prod,
      totalShiftMeters,
      totalShiftKg,
      totalBreakdownMins,
      averageEfficiency,
      runningLooms,
      idleLooms,
      progressiveTotals: [prog1, prog2, prog3, prog4, prog5, prog6],
    };
  }, [entries]);

  // Filtered entries for table rendering
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterActiveOnly && !isLoomActive(e)) {
        return false;
      }
      if (statusFilter !== "ALL" && e.status !== statusFilter) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          `#${e.loomNumber}`.includes(term) ||
          String(e.loomNumber).includes(term) ||
          (e.operatorName && e.operatorName.toLowerCase().includes(term)) ||
          (e.qualityType && e.qualityType.toLowerCase().includes(term)) ||
          (e.size && e.size.toLowerCase().includes(term)) ||
          (e.denier && e.denier.toLowerCase().includes(term)) ||
          (e.breakdownReason && e.breakdownReason.toLowerCase().includes(term)) ||
          (e.remarks && e.remarks.toLowerCase().includes(term));
        if (!match) return false;
      }
      return true;
    });
  }, [entries, filterActiveOnly, statusFilter, searchTerm]);

  const isFiltered = filterActiveOnly || statusFilter !== "ALL" || Boolean(searchTerm.trim());
  const filterLabel = filterActiveOnly
    ? "Active Running Looms Only"
    : statusFilter !== "ALL"
    ? `Status: ${statusFilter}`
    : searchTerm.trim()
    ? `Search: "${searchTerm.trim()}"`
    : undefined;

  // Save Sheet Handler (Manual Save Draft or Submit Sheet)
  const handleSaveSheet = async (targetStatus: string = sheetStatus) => {
    setSaving(true);
    try {
      const payload = {
        action: "SAVE_SHEET",
        date: selectedDate,
        shiftName: selectedShift,
        entries,
        preparedBy,
        checkedBy,
        approvedBy,
        totalWastageKg: parseFloat(totalWastageKg) || 0,
        remarks: sheetRemarks,
        status: targetStatus,
        shiftHours: data?.sheet?.shiftHours || 12,
        timeSlots: data?.sheet?.timeSlots,
        initialTimeSlot: data?.sheet?.initialTimeSlot,
      };

      const res = await fetch("/api/production/loom/reading-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save reading sheet");

      setSheetStatus(targetStatus);
      lastSavedPayloadRef.current = JSON.stringify(payload);
      setLastAutoSavedAt(new Date());

      if (targetStatus === "SUBMITTED") {
        showNotification(
          `Sheet submitted successfully: ${liveTotals.totalShiftMeters.toLocaleString()} m across ${liveTotals.runningLooms} running looms (Avg Eff: ${liveTotals.averageEfficiency}%).`
        );
      } else {
        showNotification(
          `Draft saved successfully: ${liveTotals.totalShiftMeters.toLocaleString()} m across ${liveTotals.runningLooms} running looms.`
        );
      }
    } catch (err: any) {
      console.error("handleSaveSheet error:", err);
      showNotification(err.message || "Failed to save sheet", "error");
    } finally {
      setSaving(false);
    }
  };

  // Bulk Operator Assign Handler
  const handleBulkAssign = async () => {
    const start = parseInt(bulkStartLoom, 10);
    const end = parseInt(bulkEndLoom, 10);
    if (isNaN(start) || isNaN(end) || start < 1 || end > 91 || start > end) {
      alert("Please enter a valid loom range between 1 and 91.");
      return;
    }

    try {
      // Local state update
      setEntries((prev) =>
        prev.map((e) => {
          if (e.loomNumber >= start && e.loomNumber <= end) {
            const updated = {
              ...e,
              operatorName: bulkOperator !== "" ? bulkOperator : e.operatorName,
              qualityType: bulkQuality !== "" ? bulkQuality : e.qualityType,
              size: bulkSize !== "" ? bulkSize : e.size,
              denier: bulkDenier !== "" ? bulkDenier : e.denier,
            };
            const eff = computeLoomEfficiency(
              updated.totalProduction || 0,
              updated.qualityType,
              Number(updated.breakdownMinutes) || 0,
              data?.sheet?.shiftHours || 12
            );
            updated.efficiencyPct = eff.efficiencyPct;
            return updated;
          }
          return e;
        })
      );

      setBulkModalOpen(false);
      showNotification(`Assigned operator to looms #${start} to #${end}`);
    } catch (err: any) {
      showNotification(err.message || "Bulk assign failed", "error");
    }
  };

  // Reset Sheet Handler
  const handleResetSheet = async () => {
    try {
      const res = await fetch("/api/production/loom/reading-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_SHEET",
          date: selectedDate,
          shiftName: selectedShift,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset sheet");

      setResetModalOpen(false);
      showNotification("Sheet reset to clean blank state.");
      fetchSheetData(selectedDate, selectedShift);
    } catch (err: any) {
      showNotification(err.message || "Reset failed", "error");
    }
  };

  // Clean, deduplicated shift options based on database master shifts
  const shiftOptions = useMemo(() => {
    const raw = data?.availableShifts && data.availableShifts.length > 0
      ? data.availableShifts
      : [
          { id: "shift_day", name: "DAY" },
          { id: "shift_night", name: "NIGHT" },
        ];

    const seen = new Set<string>();
    const result: { id: string; name: string; label: string }[] = [];

    for (const s of raw) {
      const upper = (s.name || "").toUpperCase().trim();
      const normKey = upper.replace(/\s+/g, "");
      if (!seen.has(normKey)) {
        seen.add(normKey);
        let label = s.name;
        if (normKey === "DAY" || normKey === "DAYSHIFT" || normKey === "SHIFTA") {
          label = "DAY (08:00 - 20:00)";
        } else if (normKey === "NIGHT" || normKey === "NIGHTSHIFT" || normKey === "SHIFTB") {
          label = "NIGHT (20:00 - 08:00)";
        }
        result.push({
          id: s.id,
          name: s.name,
          label,
        });
      }
    }

    return result;
  }, [data]);

  const currentShiftId = useMemo(() => {
    const active = shiftOptions.find((s) => s.name === selectedShift);
    return active?.id || selectedShift;
  }, [shiftOptions, selectedShift]);

  const fetchUnlockedSlots = useCallback(() => {
    if (!selectedDate || !currentShiftId) return;
    fetch(
      `/api/production/telemetry/unlock?module=LOOM_READING_SHEET&date=${selectedDate}&shiftId=${encodeURIComponent(
        currentShiftId
      )}`,
      { cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.unlockedSlots && Array.isArray(data.unlockedSlots)) {
          setUnlockedSlots(new Set(data.unlockedSlots));
        } else {
          setUnlockedSlots(new Set());
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch unlocked time slots for Loom:", err);
      });
  }, [selectedDate, currentShiftId]);

  useEffect(() => {
    fetchUnlockedSlots();
  }, [fetchUnlockedSlots]);

  const isSlotLocked = useCallback(
    (slotTime: string): boolean => {
      if (!slotTime) return false;
      const expired = isTimeSlotLocked(selectedDate, slotTime, 120);
      if (!expired) return false;
      return !unlockedSlots.has(slotTime);
    },
    [selectedDate, unlockedSlots]
  );

  const handleToggleSlotUnlock = async (slotTime: string) => {
    if (!canUnlockTimeSlots) {
      showNotification("Your role does not have permission to override or unlock expired time slots.", "error");
      return;
    }
    const isCurrentlyUnlocked = unlockedSlots.has(slotTime);
    try {
      if (isCurrentlyUnlocked) {
        const res = await fetch(
          `/api/production/telemetry/unlock?module=LOOM_READING_SHEET&date=${selectedDate}&shiftId=${encodeURIComponent(
            currentShiftId
          )}&timeSlot=${encodeURIComponent(slotTime)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to re-lock time slot");

        const next = new Set(unlockedSlots);
        next.delete(slotTime);
        setUnlockedSlots(next);
        showNotification(`Slot ${slotTime} re-locked globally.`);
      } else {
        const res = await fetch("/api/production/telemetry/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: "LOOM_READING_SHEET",
            date: selectedDate,
            shiftId: currentShiftId,
            timeSlot: slotTime,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to unlock time slot");
        }

        const next = new Set(unlockedSlots);
        next.add(slotTime);
        setUnlockedSlots(next);
        showNotification(`Slot ${slotTime} unlocked globally for all factory operators.`);
      }
    } catch (err: any) {
      console.error("Loom slot unlock toggle error:", err);
      showNotification(err.message || "Operation failed", "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* DESKTOP VIEW (100% PRESERVED) */}
      <div className="hidden md:block space-y-4">
        {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-xl font-bold text-sm shrink-0">
                2H
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    2 Hours Reading Sheet
                  </h1>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                      sheetStatus === "SUBMITTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : sheetStatus === "APPROVED"
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}
                  >
                    {sheetStatus === "SUBMITTED" ? "✓ Submitted" : sheetStatus === "APPROVED" ? "★ Approved" : "● Draft"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Real-time Auto-Save Status Pill */}
            {autoSaving ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200 animate-pulse font-medium shadow-2xs">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span>Auto-saving...</span>
              </div>
            ) : lastAutoSavedAt ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 font-medium shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">
                  Auto-saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className="sm:hidden">Auto-saved</span>
              </div>
            ) : null}

            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>Assign Range</span>
            </button>

            <button
              onClick={() =>
                exportLoomReadingSheetExcel({
                  date: selectedDate,
                  shiftName: selectedShift,
                  preparedBy,
                  checkedBy,
                  approvedBy,
                  timeSlots,
                  initialTimeSlot,
                  entries: filteredEntries,
                  kpis: {
                    totalLooms: 91,
                    runningLoomsCount: liveTotals.runningLooms,
                    idleLoomsCount: liveTotals.idleLooms,
                    totalShiftMeters: liveTotals.totalShiftMeters,
                    totalShiftKg: liveTotals.totalShiftKg,
                    totalWastageKg: parseFloat(totalWastageKg) || 0,
                    averageEfficiency: liveTotals.averageEfficiency,
                    totalBreakdownMins: liveTotals.totalBreakdownMins,
                    intervalTotals: [],
                  },
                  filterActiveOnly: false,
                })
              }
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title={isFiltered ? `Export filtered ${filteredEntries.length} looms to Excel` : "Export 2-hours reading sheet to Excel"}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Excel Export</span>
              {isFiltered && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>

            <button
              onClick={() => setPreviewModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title={isFiltered ? `Preview & print filtered ${filteredEntries.length} looms` : "Preview & print A4 sheet"}
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Preview</span>
              {isFiltered && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>

            <button
              onClick={() => setResetModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all inline-flex items-center gap-1 cursor-pointer"
              title="Reset Sheet to Blank"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => handleSaveSheet("SUBMITTED")}
              disabled={saving || autoSaving}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Submit and finalize this shift reading sheet"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving && sheetStatus === "SUBMITTED" ? "Submitting..." : "Submit Sheet"}</span>
            </button>
          </div>
        </div>

        {/* Date, Shift, and Quick Filter Selector Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>Production Date:</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all"
              />
              <button
                type="button"
                onClick={() => handleDateChange(new Date().toISOString().slice(0, 10))}
                className="px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all"
              >
                Today
              </button>
            </div>
          </div>

          {/* Shift Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>Shift:</span>
            </label>
            <select
              value={selectedShift}
              onChange={(e) => handleShiftChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all"
            >
              {shiftOptions.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Search className="h-3 w-3 text-slate-400" />
              <span>Search Looms:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search loom #, operator, quality..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-2.5 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status & View Toggles */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-slate-400" />
              <span>View Filter:</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterActiveOnly((prev) => !prev)}
                className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                  filterActiveOnly
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {filterActiveOnly ? "Active Only (Default)" : "All 91 Looms"}
              </button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all"
              >
                <option value="ALL">All Status</option>
                <option value="RUNNING">Running</option>
                <option value="STOP">Stopped</option>
                <option value="IDLE">Idle</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Live KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Running Looms</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-emerald-700 font-mono">
              {liveTotals.runningLooms}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ 91 Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Shift Meters</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {liveTotals.totalShiftMeters.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">Meters</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Output Weight (Est.)</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-blue-700 font-mono">
              {liveTotals.totalShiftKg.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">KG</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Avg Efficiency</span>
            <Gauge className="h-3 w-3 text-sky-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl font-extrabold font-mono ${
                liveTotals.averageEfficiency >= 85
                  ? "text-emerald-600"
                  : liveTotals.averageEfficiency >= 70
                  ? "text-amber-600"
                  : "text-slate-900"
              }`}
            >
              {liveTotals.averageEfficiency}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">std speed</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Total Breakdown</span>
            <Timer className="h-3 w-3 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-amber-700 font-mono">
              {liveTotals.totalBreakdownMins}
            </span>
            <span className="text-xs text-slate-500 font-medium">Mins</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Shift Wastage</div>
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="number"
              value={totalWastageKg}
              onChange={(e) => setTotalWastageKg(e.target.value)}
              onBlur={() => triggerAutoSave(true)}
              className="w-20 px-2 py-0.5 text-base font-extrabold text-rose-700 font-mono bg-rose-50/50 border border-rose-200 rounded-lg outline-none focus:bg-white focus:border-rose-400"
              placeholder="0"
            />
            <span className="text-xs text-slate-500 font-medium">KG</span>
          </div>
        </div>
      </div>

      {/* Progressive Interval Totals Strip */}
      <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="font-bold tracking-wide uppercase text-[11px] text-sky-900">
            Progressive Interval Totals:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-[11px]">
          {timeSlots.map((slot, idx) => {
            const prog = liveTotals.progressiveTotals[idx] || 0;
            return (
              <div key={slot} className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-sky-200 shadow-2xs">
                <span className="text-slate-500 font-medium">{slot}:</span>
                <span className="font-bold text-sky-700">{prog.toLocaleString()} m</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Bi-Hourly Reading Table */}
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-6 shadow-2xl overflow-hidden"
            : "bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden"
        }
      >
        {/* Horizontal Scroll Guidance Header */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
              title={isFullscreen ? "Collapse back to normal view (Esc)" : "Expand sheet to fullscreen"}
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
            </button>
            <span className="font-bold text-slate-800">Circular Loom 2-Hours Shift Log Grid (Looms #1 to #91)</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            ← Scroll horizontally to view all intervals, breakdown reasons, and target changeover qualities →
          </span>
        </div>
        <div className={isFullscreen ? "overflow-x-auto overflow-y-auto flex-1 border rounded-lg bg-card" : "overflow-x-auto max-h-[75vh]"}>
          <table className="w-full text-left text-xs border-collapse min-w-[2550px]">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <th className="sticky left-0 bg-slate-100 z-20 py-3 px-3 text-center w-20 min-w-[80px] border-r-2 border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]" rowSpan={2}>
                  Loom #
                </th>
                <th className="py-3 px-2 text-center w-20 min-w-[75px] border-r border-slate-200" rowSpan={2}>
                  Photo
                </th>
                <th className="py-3 px-3.5 w-48 min-w-[180px] border-r border-slate-200" rowSpan={2}>
                  Operator Name
                </th>
                <th className="py-3 px-2 text-center w-28 min-w-[100px] border-r border-slate-200" rowSpan={2}>
                  Size (mm)
                </th>
                <th className="py-3 px-2 text-center w-28 min-w-[100px] border-r border-slate-200" rowSpan={2}>
                  Denier (DNR)
                </th>
                <th className="py-3 px-3.5 w-64 min-w-[240px] border-r border-slate-200" rowSpan={2}>
                  Type / Quality
                </th>
                <th className="py-3 px-3 text-right w-32 min-w-[120px] bg-slate-200/60 border-r border-slate-200" rowSpan={2}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>I/R {initialTimeSlot}</span>
                    {isTimeSlotLocked(selectedDate, initialTimeSlot, 120) && (
                      canUnlockTimeSlots ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleToggleSlotUnlock(initialTimeSlot);
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            unlockedSlots.has(initialTimeSlot)
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title={
                            unlockedSlots.has(initialTimeSlot)
                              ? `Interval ${initialTimeSlot} is Unlocked globally. Click to re-lock.`
                              : `Interval ${initialTimeSlot} is Auto-Locked. Click to unlock globally for all operators.`
                          }
                        >
                          {unlockedSlots.has(initialTimeSlot) ? <Unlock className="h-3 w-3 text-emerald-700" /> : <Lock className="h-3 w-3 text-amber-700" />}
                        </button>
                      ) : (
                        <span
                          className="p-0.5"
                          title={
                            unlockedSlots.has(initialTimeSlot)
                              ? `Interval ${initialTimeSlot} is Unlocked by supervisor.`
                              : `Interval ${initialTimeSlot} is Auto-Locked (>2h). Supervisor authorization required.`
                          }
                        >
                          {unlockedSlots.has(initialTimeSlot) ? <Unlock className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-slate-400" />}
                        </span>
                      )
                    )}
                  </div>
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200" colSpan={2}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{timeSlots[0] || "10:00"}</span>
                    {isTimeSlotLocked(selectedDate, timeSlots[0] || "10:00", 120) && (
                      canUnlockTimeSlots ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleToggleSlotUnlock(timeSlots[0] || "10:00");
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            unlockedSlots.has(timeSlots[0] || "10:00")
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title={
                            unlockedSlots.has(timeSlots[0] || "10:00")
                              ? `Interval ${timeSlots[0] || "10:00"} is Unlocked globally. Click to re-lock.`
                              : `Interval ${timeSlots[0] || "10:00"} is Auto-Locked. Click to unlock globally for all operators.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[0] || "10:00") ? <Unlock className="h-3 w-3 text-emerald-700" /> : <Lock className="h-3 w-3 text-amber-700" />}
                        </button>
                      ) : (
                        <span
                          className="p-0.5"
                          title={
                            unlockedSlots.has(timeSlots[0] || "10:00")
                              ? `Interval ${timeSlots[0] || "10:00"} is Unlocked by supervisor.`
                              : `Interval ${timeSlots[0] || "10:00"} is Auto-Locked (>2h). Supervisor authorization required.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[0] || "10:00") ? <Unlock className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-slate-400" />}
                        </span>
                      )
                    )}
                  </div>
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200" colSpan={2}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{timeSlots[1] || "12:00"}</span>
                    {isTimeSlotLocked(selectedDate, timeSlots[1] || "12:00", 120) && (
                      canUnlockTimeSlots ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleToggleSlotUnlock(timeSlots[1] || "12:00");
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            unlockedSlots.has(timeSlots[1] || "12:00")
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title={
                            unlockedSlots.has(timeSlots[1] || "12:00")
                              ? `Interval ${timeSlots[1] || "12:00"} is Unlocked globally. Click to re-lock.`
                              : `Interval ${timeSlots[1] || "12:00"} is Auto-Locked. Click to unlock globally for all operators.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[1] || "12:00") ? <Unlock className="h-3 w-3 text-emerald-700" /> : <Lock className="h-3 w-3 text-amber-700" />}
                        </button>
                      ) : (
                        <span
                          className="p-0.5"
                          title={
                            unlockedSlots.has(timeSlots[1] || "12:00")
                              ? `Interval ${timeSlots[1] || "12:00"} is Unlocked by supervisor.`
                              : `Interval ${timeSlots[1] || "12:00"} is Auto-Locked (>2h). Supervisor authorization required.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[1] || "12:00") ? <Unlock className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-slate-400" />}
                        </span>
                      )
                    )}
                  </div>
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200" colSpan={2}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{timeSlots[2] || "14:00"}</span>
                    {isTimeSlotLocked(selectedDate, timeSlots[2] || "14:00", 120) && (
                      canUnlockTimeSlots ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleToggleSlotUnlock(timeSlots[2] || "14:00");
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            unlockedSlots.has(timeSlots[2] || "14:00")
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title={
                            unlockedSlots.has(timeSlots[2] || "14:00")
                              ? `Interval ${timeSlots[2] || "14:00"} is Unlocked globally. Click to re-lock.`
                              : `Interval ${timeSlots[2] || "14:00"} is Auto-Locked. Click to unlock globally for all operators.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[2] || "14:00") ? <Unlock className="h-3 w-3 text-emerald-700" /> : <Lock className="h-3 w-3 text-amber-700" />}
                        </button>
                      ) : (
                        <span
                          className="p-0.5"
                          title={
                            unlockedSlots.has(timeSlots[2] || "14:00")
                              ? `Interval ${timeSlots[2] || "14:00"} is Unlocked by supervisor.`
                              : `Interval ${timeSlots[2] || "14:00"} is Auto-Locked (>2h). Supervisor authorization required.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[2] || "14:00") ? <Unlock className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-slate-400" />}
                        </span>
                      )
                    )}
                  </div>
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200" colSpan={2}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{timeSlots[3] || "16:00"}</span>
                    {isTimeSlotLocked(selectedDate, timeSlots[3] || "16:00", 120) && (
                      canUnlockTimeSlots ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleToggleSlotUnlock(timeSlots[3] || "16:00");
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            unlockedSlots.has(timeSlots[3] || "16:00")
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title={
                            unlockedSlots.has(timeSlots[3] || "16:00")
                              ? `Interval ${timeSlots[3] || "16:00"} is Unlocked globally. Click to re-lock.`
                              : `Interval ${timeSlots[3] || "16:00"} is Auto-Locked. Click to unlock globally for all operators.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[3] || "16:00") ? <Unlock className="h-3 w-3 text-emerald-700" /> : <Lock className="h-3 w-3 text-amber-700" />}
                        </button>
                      ) : (
                        <span
                          className="p-0.5"
                          title={
                            unlockedSlots.has(timeSlots[3] || "16:00")
                              ? `Interval ${timeSlots[3] || "16:00"} is Unlocked by supervisor.`
                              : `Interval ${timeSlots[3] || "16:00"} is Auto-Locked (>2h). Supervisor authorization required.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[3] || "16:00") ? <Unlock className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-slate-400" />}
                        </span>
                      )
                    )}
                  </div>
                </th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200" colSpan={2}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{timeSlots[4] || "18:00"}</span>
                    {isTimeSlotLocked(selectedDate, timeSlots[4] || "18:00", 120) && (
                      canUnlockTimeSlots ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleToggleSlotUnlock(timeSlots[4] || "18:00");
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            unlockedSlots.has(timeSlots[4] || "18:00")
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title={
                            unlockedSlots.has(timeSlots[4] || "18:00")
                              ? `Interval ${timeSlots[4] || "18:00"} is Unlocked globally. Click to re-lock.`
                              : `Interval ${timeSlots[4] || "18:00"} is Auto-Locked. Click to unlock globally for all operators.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[4] || "18:00") ? <Unlock className="h-3 w-3 text-emerald-700" /> : <Lock className="h-3 w-3 text-amber-700" />}
                        </button>
                      ) : (
                        <span
                          className="p-0.5"
                          title={
                            unlockedSlots.has(timeSlots[4] || "18:00")
                              ? `Interval ${timeSlots[4] || "18:00"} is Unlocked by supervisor.`
                              : `Interval ${timeSlots[4] || "18:00"} is Auto-Locked (>2h). Supervisor authorization required.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[4] || "18:00") ? <Unlock className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-slate-400" />}
                        </span>
                      )
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-right w-32 min-w-[120px] bg-slate-200/60 border-r border-slate-200" rowSpan={2}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{timeSlots[5] || "20:00"} End</span>
                    {isTimeSlotLocked(selectedDate, timeSlots[5] || "20:00", 120) && (
                      canUnlockTimeSlots ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleToggleSlotUnlock(timeSlots[5] || "20:00");
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            unlockedSlots.has(timeSlots[5] || "20:00")
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title={
                            unlockedSlots.has(timeSlots[5] || "20:00")
                              ? `Interval ${timeSlots[5] || "20:00"} is Unlocked globally. Click to re-lock.`
                              : `Interval ${timeSlots[5] || "20:00"} is Auto-Locked. Click to unlock globally for all operators.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[5] || "20:00") ? <Unlock className="h-3 w-3 text-emerald-700" /> : <Lock className="h-3 w-3 text-amber-700" />}
                        </button>
                      ) : (
                        <span
                          className="p-0.5"
                          title={
                            unlockedSlots.has(timeSlots[5] || "20:00")
                              ? `Interval ${timeSlots[5] || "20:00"} is Unlocked by supervisor.`
                              : `Interval ${timeSlots[5] || "20:00"} is Auto-Locked (>2h). Supervisor authorization required.`
                          }
                        >
                          {unlockedSlots.has(timeSlots[5] || "20:00") ? <Unlock className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-slate-400" />}
                        </span>
                      )
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-right w-36 min-w-[130px] bg-blue-50/80 border-r border-slate-200 text-blue-950 font-black" rowSpan={2}>
                  T PROD (M)
                </th>
                <th className="py-3 px-3 text-center w-64 min-w-[260px] border-r border-slate-200 bg-amber-50/50" rowSpan={2}>
                  Breakdown (Reason / Min)
                </th>
                <th className="py-3 px-3 text-center w-60 min-w-[240px] border-r border-slate-200 bg-amber-100/50" rowSpan={2}>
                  C/O Target Quality
                </th>
                <th className="py-3 px-3 text-center w-32 min-w-[120px] border-r border-slate-200 bg-sky-50/60" rowSpan={2}>
                  Efficiency
                </th>
                <th className="py-3 px-3.5 w-64 min-w-[250px]" rowSpan={2}>
                  Remarks / Status
                </th>
              </tr>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-[10px]">
                <th className="py-1 px-2 text-right w-28 min-w-[105px]">Read</th>
                <th className="py-1 px-2 text-right w-24 min-w-[90px] bg-emerald-50 text-emerald-800 border-r border-slate-200 font-black">Prod</th>
                <th className="py-1 px-2 text-right w-28 min-w-[105px]">Read</th>
                <th className="py-1 px-2 text-right w-24 min-w-[90px] bg-emerald-50 text-emerald-800 border-r border-slate-200 font-black">Prod</th>
                <th className="py-1 px-2 text-right w-28 min-w-[105px]">Read</th>
                <th className="py-1 px-2 text-right w-24 min-w-[90px] bg-emerald-50 text-emerald-800 border-r border-slate-200 font-black">Prod</th>
                <th className="py-1 px-2 text-right w-28 min-w-[105px]">Read</th>
                <th className="py-1 px-2 text-right w-24 min-w-[90px] bg-emerald-50 text-emerald-800 border-r border-slate-200 font-black">Prod</th>
                <th className="py-1 px-2 text-right w-28 min-w-[105px]">Read</th>
                <th className="py-1 px-2 text-right w-24 min-w-[90px] bg-emerald-50 text-emerald-800 border-r border-slate-200 font-black">Prod</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={24} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2.5 font-semibold text-sm">
                      <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      <span>Loading Circular Loom 2-Hours Reading Sheet...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={24} className="py-12 text-center text-slate-400 font-medium italic text-sm">
                    No loom machines match the active filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const isRunning = e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0);
                  const isLpp = (e.qualityType || "").toUpperCase().includes("LPP");
                  const stdSpeed = isLpp ? "2.50 m/m" : "2.01 m/m";
                  const effVal = typeof e.efficiencyPct === "number" && e.efficiencyPct > 0 ? e.efficiencyPct : 0;
                  const rowSeq = e.rowSequence || 1;
                  const isSplitRow = rowSeq > 1;

                  const isInitialLocked = isSlotLocked(initialTimeSlot);
                  const isR1Locked = isSlotLocked(timeSlots[0] || "10:00");
                  const isR2Locked = isSlotLocked(timeSlots[1] || "12:00");
                  const isR3Locked = isSlotLocked(timeSlots[2] || "14:00");
                  const isR4Locked = isSlotLocked(timeSlots[3] || "16:00");
                  const isR5Locked = isSlotLocked(timeSlots[4] || "18:00");
                  const isR6Locked = isSlotLocked(timeSlots[5] || "20:00");

                  return (
                    <tr
                      key={e.id || `${e.loomNumber}-${rowSeq}`}
                      className={`hover:bg-slate-50 transition-colors group ${
                        isSplitRow
                          ? "bg-amber-50/20"
                          : e.status === "STOP"
                          ? "bg-rose-50/30"
                          : e.status === "CLEANING"
                          ? "bg-amber-50/30"
                          : isRunning
                          ? "bg-white"
                          : "bg-slate-50/50 text-slate-400"
                      }`}
                    >
                      {/* Sticky Loom Number Column with Split Action */}
                      <td className={`sticky left-0 z-10 py-2 px-3 text-center font-black font-mono text-sm border-r-2 border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] ${
                        isSplitRow
                          ? "bg-amber-100/90 text-amber-950"
                          : e.status === "STOP"
                          ? "bg-rose-100/80 text-rose-950"
                          : e.status === "CLEANING"
                          ? "bg-amber-100/80 text-amber-950"
                          : isRunning
                          ? "bg-white text-slate-950 group-hover:bg-slate-50"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-100"
                      }`}>
                        <div className="flex items-center justify-center gap-1.5">
                          <span>#{e.loomNumber}</span>
                          {isSplitRow ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1 py-0.5 rounded">
                              C/O
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddSplitRow(e.loomNumber)}
                              title="Add quality changeover split row for this loom"
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-600 transition-opacity cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Physical Meter Counter Photo Cell */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => setPhotoModalEntry(e)}
                          className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                            e.photoUrl
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                              : "bg-white text-slate-600 border-slate-300 hover:border-slate-500 hover:bg-slate-50 shadow-2xs"
                          }`}
                          title={
                            e.photoUrl
                              ? "View / change physical meter counter photo"
                              : "Attach physical meter counter photo"
                          }
                        >
                          {e.photoUrl ? (
                            <>
                              <ImageIcon className="h-3 w-3 text-emerald-600" />
                              <span>View</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-3 w-3 text-slate-400" />
                              <span>+ Photo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Operator Name Dropdown (from Data Centre) */}
                      <td className="py-1.5 px-2.5 border-r border-slate-100">
                        <select
                          value={e.operatorName || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "operatorName", ev.target.value)}
                          onBlur={() => triggerAutoSave(true)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50/60 group-hover:bg-white focus:bg-white border border-slate-200 focus:border-slate-800 rounded-lg outline-none font-medium text-slate-800 cursor-pointer transition-all truncate"
                        >
                          <option value="">-- Select Operator --</option>
                          {(data?.availableOperators || []).map((op) => (
                            <option key={op.id || op.name} value={op.name}>
                              {op.name} {op.employeeCode ? `(${op.employeeCode})` : ""}
                            </option>
                          ))}
                          {e.operatorName &&
                            !(data?.availableOperators || []).some(
                              (op) => op.name.toLowerCase() === e.operatorName?.toLowerCase()
                            ) && <option value={e.operatorName}>{e.operatorName}</option>}
                        </select>
                      </td>

                      {/* Size (Auto-derived from Quality) */}
                      <td className="py-1.5 px-2 border-r border-slate-100">
                        <input
                          type="text"
                          value={e.size || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "size", ev.target.value)}
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="Size"
                          title="Auto-derived from assigned Quality"
                          className="w-full px-2 py-1.5 text-xs text-center font-mono font-bold text-slate-800 bg-slate-100/60 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-slate-800 rounded-lg outline-none placeholder:text-slate-300 transition-all"
                        />
                      </td>

                      {/* Denier (Auto-derived from Quality) */}
                      <td className="py-1.5 px-2 border-r border-slate-100">
                        <input
                          type="text"
                          value={e.denier || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "denier", ev.target.value)}
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="DNR"
                          title="Auto-derived from assigned Quality"
                          className="w-full px-2 py-1.5 text-xs text-center font-mono font-bold text-slate-800 bg-slate-100/60 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-slate-800 rounded-lg outline-none placeholder:text-slate-300 transition-all"
                        />
                      </td>

                      {/* Quality Type (Dropdown synced with Quality Master) */}
                      <td className="py-1 px-1.5 border-r border-slate-100 min-w-[170px]">
                        <UniversalQualityInput
                          value={e.qualityType || ""}
                          onChange={(newCode) => {
                            handleEntryChange(e.loomNumber, rowSeq, "qualityType", newCode);
                            triggerAutoSave(true);
                          }}
                          options={data?.availableQualities || []}
                          placeholder="— Quality —"
                          compact={true}
                          inputClassName="h-7 text-xs font-bold"
                        />
                      </td>

                      {/* Initial Reading */}
                      <td className="py-1.5 px-2.5 bg-slate-50/50 border-r border-slate-100">
                        <input
                          type="number"
                          disabled={isInitialLocked}
                          readOnly={isInitialLocked}
                          value={e.initialReading !== null && e.initialReading !== undefined ? e.initialReading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              rowSeq,
                              "initialReading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="I/R"
                          title={isInitialLocked ? `Auto-locked (>2h window past ${initialTimeSlot}). Supervisor unlock required.` : "Initial reading"}
                          className={`w-full px-2 py-1.5 text-xs text-right font-mono font-black rounded-lg outline-none transition-all ${
                            isInitialLocked
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none"
                              : "text-slate-800 bg-slate-100/70 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-slate-800 placeholder:text-slate-300"
                          }`}
                        />
                      </td>

                      {/* Interval 1 Reading & Prod */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          disabled={isR1Locked}
                          readOnly={isR1Locked}
                          value={e.r1Reading !== null && e.r1Reading !== undefined ? e.r1Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              rowSeq,
                              "r1Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="—"
                          title={isR1Locked ? `Auto-locked (>2h window past ${timeSlots[0] || "10:00"}). Supervisor unlock required.` : undefined}
                          className={`w-full px-2 py-1.5 text-xs text-right font-mono rounded-lg outline-none transition-all ${
                            isR1Locked
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none"
                              : "text-slate-800 bg-slate-50/40 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-slate-800"
                          }`}
                        />
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-black text-xs text-emerald-800 bg-emerald-50/50 border-r border-slate-100">
                        {e.r1Prod !== null && e.r1Prod > 0 ? e.r1Prod.toLocaleString() : e.r1Prod === 0 ? "0" : "—"}
                      </td>

                      {/* Interval 2 Reading & Prod */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          disabled={isR2Locked}
                          readOnly={isR2Locked}
                          value={e.r2Reading !== null && e.r2Reading !== undefined ? e.r2Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              rowSeq,
                              "r2Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="—"
                          title={isR2Locked ? `Auto-locked (>2h window past ${timeSlots[1] || "12:00"}). Supervisor unlock required.` : undefined}
                          className={`w-full px-2 py-1.5 text-xs text-right font-mono rounded-lg outline-none transition-all ${
                            isR2Locked
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none"
                              : "text-slate-800 bg-slate-50/40 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-slate-800"
                          }`}
                        />
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-black text-xs text-emerald-800 bg-emerald-50/50 border-r border-slate-100">
                        {e.r2Prod !== null && e.r2Prod > 0 ? e.r2Prod.toLocaleString() : e.r2Prod === 0 ? "0" : "—"}
                      </td>

                      {/* Interval 3 Reading & Prod */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          disabled={isR3Locked}
                          readOnly={isR3Locked}
                          value={e.r3Reading !== null && e.r3Reading !== undefined ? e.r3Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              rowSeq,
                              "r3Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="—"
                          title={isR3Locked ? `Auto-locked (>2h window past ${timeSlots[2] || "14:00"}). Supervisor unlock required.` : undefined}
                          className={`w-full px-2 py-1.5 text-xs text-right font-mono rounded-lg outline-none transition-all ${
                            isR3Locked
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none"
                              : "text-slate-800 bg-slate-50/40 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-slate-800"
                          }`}
                        />
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-black text-xs text-emerald-800 bg-emerald-50/50 border-r border-slate-100">
                        {e.r3Prod !== null && e.r3Prod > 0 ? e.r3Prod.toLocaleString() : e.r3Prod === 0 ? "0" : "—"}
                      </td>

                      {/* Interval 4 Reading & Prod */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          disabled={isR4Locked}
                          readOnly={isR4Locked}
                          value={e.r4Reading !== null && e.r4Reading !== undefined ? e.r4Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              rowSeq,
                              "r4Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="—"
                          title={isR4Locked ? `Auto-locked (>2h window past ${timeSlots[3] || "16:00"}). Supervisor unlock required.` : undefined}
                          className={`w-full px-2 py-1.5 text-xs text-right font-mono rounded-lg outline-none transition-all ${
                            isR4Locked
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none"
                              : "text-slate-800 bg-slate-50/40 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-slate-800"
                          }`}
                        />
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-black text-xs text-emerald-800 bg-emerald-50/50 border-r border-slate-100">
                        {e.r4Prod !== null && e.r4Prod > 0 ? e.r4Prod.toLocaleString() : e.r4Prod === 0 ? "0" : "—"}
                      </td>

                      {/* Interval 5 Reading & Prod */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          disabled={isR5Locked}
                          readOnly={isR5Locked}
                          value={e.r5Reading !== null && e.r5Reading !== undefined ? e.r5Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              rowSeq,
                              "r5Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="—"
                          title={isR5Locked ? `Auto-locked (>2h window past ${timeSlots[4] || "18:00"}). Supervisor unlock required.` : undefined}
                          className={`w-full px-2 py-1.5 text-xs text-right font-mono rounded-lg outline-none transition-all ${
                            isR5Locked
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none"
                              : "text-slate-800 bg-slate-50/40 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-slate-800"
                          }`}
                        />
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-black text-xs text-emerald-800 bg-emerald-50/50 border-r border-slate-100">
                        {e.r5Prod !== null && e.r5Prod > 0 ? e.r5Prod.toLocaleString() : e.r5Prod === 0 ? "0" : "—"}
                      </td>

                      {/* Interval 6 (Final Reading) */}
                      <td className="py-1.5 px-2.5 bg-slate-50/50 border-r border-slate-100">
                        <input
                          type="number"
                          disabled={isR6Locked}
                          readOnly={isR6Locked}
                          value={e.r6Reading !== null && e.r6Reading !== undefined ? e.r6Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              rowSeq,
                              "r6Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="End Read"
                          title={isR6Locked ? `Auto-locked (>2h window past ${timeSlots[5] || "20:00"}). Supervisor unlock required.` : "Final reading"}
                          className={`w-full px-2 py-1.5 text-xs text-right font-mono font-black rounded-lg outline-none transition-all ${
                            isR6Locked
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200 select-none"
                              : "text-slate-800 bg-slate-100/70 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-slate-800 placeholder:text-slate-300"
                          }`}
                        />
                      </td>

                      {/* Total Shift Production (Meters) */}
                      <td className="py-1.5 px-3 text-right font-mono font-black text-sm text-blue-950 bg-blue-50/60 border-r border-slate-100">
                        {e.totalProduction > 0 ? e.totalProduction.toLocaleString() : "—"}
                      </td>

                      {/* Breakdown Column: Reason dropdown + Downtime in minutes */}
                      <td className="py-1.5 px-2.5 border-r border-slate-100 bg-amber-50/20">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={e.breakdownReason || ""}
                            onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "breakdownReason", ev.target.value || null)}
                            onBlur={() => triggerAutoSave(true)}
                            className="flex-1 text-xs font-semibold px-2 py-1 bg-white border border-amber-300 text-slate-800 rounded-lg outline-none hover:border-amber-500 focus:border-amber-600 shadow-2xs cursor-pointer"
                          >
                            <option value="">No Breakdown</option>
                            {LOOM_BREAKDOWN_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1 shrink-0 bg-white px-1.5 py-0.5 border border-amber-300 rounded-lg">
                            <input
                              type="number"
                              min="0"
                              max="720"
                              value={e.breakdownMinutes !== null && e.breakdownMinutes !== undefined ? e.breakdownMinutes : ""}
                              onChange={(ev) =>
                                handleEntryChange(
                                  e.loomNumber,
                                  rowSeq,
                                  "breakdownMinutes",
                                  ev.target.value === "" ? 0 : Math.max(0, parseInt(ev.target.value, 10) || 0)
                                )
                              }
                              onBlur={() => triggerAutoSave(true)}
                              placeholder="0"
                              title="Downtime in minutes"
                              className="w-12 text-xs text-right font-mono font-black text-amber-950 outline-none"
                            />
                            <span className="text-[10px] font-bold text-amber-700">m</span>
                          </div>
                        </div>
                      </td>

                      {/* C/O Target Quality Column */}
                      <td className="py-1 px-1.5 border-r border-slate-100 min-w-[170px] bg-amber-50/20">
                        {e.breakdownReason === "Change Over" || e.changeoverTargetQuality ? (
                          <UniversalQualityInput
                            value={e.changeoverTargetQuality || ""}
                            onChange={(newCode) => {
                              handleEntryChange(e.loomNumber, rowSeq, "changeoverTargetQuality", newCode || null);
                              triggerAutoSave(true);
                            }}
                            options={data?.availableQualities || []}
                            placeholder="Target Quality..."
                            compact={true}
                            inputClassName="h-7 text-xs font-bold text-amber-950 border-amber-300"
                          />
                        ) : (
                          <div className="text-center text-slate-300 text-xs font-mono select-none">—</div>
                        )}
                      </td>

                      {/* Live Efficiency Column */}
                      <td className="py-1.5 px-2.5 text-center font-mono border-r border-slate-100 bg-sky-50/30">
                        {effVal > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-xs font-black ${
                                effVal >= 85
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  : effVal >= 70
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-rose-100 text-rose-900 border border-rose-300"
                              }`}
                            >
                              {effVal}%
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                              {stdSpeed}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-normal text-xs">—</span>
                        )}
                      </td>

                      {/* Remarks / Status / Actions */}
                      <td className="py-1.5 px-3 flex items-center gap-2">
                        <select
                          value={e.status}
                          onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "status", ev.target.value)}
                          onBlur={() => triggerAutoSave(true)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                            e.status === "RUNNING"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : e.status === "STOP"
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : e.status === "CLEANING"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : e.status === "CHANGEOVER"
                              ? "bg-amber-100 text-amber-900 border-amber-400"
                              : "bg-slate-100 text-slate-600 border-slate-300"
                          }`}
                        >
                          <option value="RUNNING">RUN</option>
                          <option value="STOP">STOP</option>
                          <option value="CLEANING">CLEAN</option>
                          <option value="CHANGEOVER">C/O</option>
                          <option value="IDLE">IDLE</option>
                        </select>
                        <input
                          type="text"
                          value={e.remarks || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "remarks", ev.target.value)}
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="Notes..."
                          className="flex-1 min-w-[110px] px-2 py-1 text-xs bg-slate-50/40 group-hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-slate-800 rounded-lg outline-none transition-all placeholder:text-slate-300"
                        />
                        {isSplitRow && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSplitRow(e.loomNumber, rowSeq)}
                            title="Remove this quality changeover split row"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer: Column Interval Totals */}
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <td className="sticky left-0 bg-slate-200/90 z-20 py-3 px-3 text-center font-black font-mono text-sm text-slate-900 border-r-2 border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                  TOTAL
                </td>
                <td colSpan={6} className="py-3 px-4 text-right uppercase text-[11px] font-bold text-slate-700 border-r border-slate-200">
                  Total Interval Production (Meters):
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2.5 px-2.5 text-right font-mono font-black text-sm text-emerald-900 bg-emerald-100/90 border-r border-slate-200">
                  {liveTotals.totalR1Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2.5 px-2.5 text-right font-mono font-black text-sm text-emerald-900 bg-emerald-100/90 border-r border-slate-200">
                  {liveTotals.totalR2Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2.5 px-2.5 text-right font-mono font-black text-sm text-emerald-900 bg-emerald-100/90 border-r border-slate-200">
                  {liveTotals.totalR3Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2.5 px-2.5 text-right font-mono font-black text-sm text-emerald-900 bg-emerald-100/90 border-r border-slate-200">
                  {liveTotals.totalR4Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2.5 px-2.5 text-right font-mono font-black text-sm text-emerald-900 bg-emerald-100/90 border-r border-slate-200">
                  {liveTotals.totalR5Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-blue-950 bg-blue-100 border-r border-slate-200">
                  {liveTotals.totalShiftMeters.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-black text-xs text-amber-950 bg-amber-100/90 border-r border-slate-200">
                  {liveTotals.totalBreakdownMins > 0 ? `${liveTotals.totalBreakdownMins} Mins` : "0 Mins"}
                </td>
                <td className="border-r border-slate-200 bg-amber-50/40"></td>
                <td className="py-2.5 px-2 text-center font-mono font-black text-xs text-sky-950 bg-sky-100/90 border-r border-slate-200">
                  {liveTotals.averageEfficiency}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Sign-Off Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Official Shift Approvals & Authorization
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Prepared By (Loom Shed In-Charge):
            </label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              onBlur={() => triggerAutoSave(true)}
              placeholder="e.g. Ravinder Kumar"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Checked By (Shift Supervisor):
            </label>
            <input
              type="text"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              onBlur={() => triggerAutoSave(true)}
              placeholder="e.g. Suresh Sharma"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Approved By (Plant Manager):
            </label>
            <input
              type="text"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              onBlur={() => triggerAutoSave(true)}
              placeholder="e.g. Plant Manager"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all font-medium"
            />
          </div>
        </div>
      </div>
      </div>

      {/* MOBILE APP VIEW */}
      <div className="block md:hidden space-y-3">
        {/* Mobile Header Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 bg-primary/10 text-primary rounded-xl font-bold text-xs shrink-0">
                2H
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                    2H Reading Sheet
                  </h1>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full border ${
                      sheetStatus === "SUBMITTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : sheetStatus === "APPROVED"
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}
                  >
                    {sheetStatus === "SUBMITTED" ? "✓ Submitted" : sheetStatus === "APPROVED" ? "★ Approved" : "Draft"}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              onClick={() => handleSaveSheet("SUBMITTED")}
              disabled={saving || autoSaving}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving && sheetStatus === "SUBMITTED" ? "..." : "Submit"}</span>
            </button>
          </div>

          {/* Subtitle & Secondary Action Toolbar */}
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
            {autoSaving ? (
              <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                <span>Saving...</span>
              </div>
            ) : lastAutoSavedAt ? (
              <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium truncate max-w-[150px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="truncate">Saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">Auto-save on</span>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setBulkModalOpen(true)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                title="Assign Operator Range"
              >
                <Users className="h-3 w-3 text-slate-500" />
                <span>+ Range</span>
              </button>

              <button
                onClick={() => setPreviewModalOpen(true)}
                className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs cursor-pointer"
                title="Print Preview"
              >
                <Printer className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() =>
                  exportLoomReadingSheetExcel({
                    date: selectedDate,
                    shiftName: selectedShift,
                    preparedBy,
                    checkedBy,
                    approvedBy,
                    timeSlots,
                    initialTimeSlot,
                    entries: filteredEntries,
                    kpis: {
                      totalLooms: 91,
                      runningLoomsCount: liveTotals.runningLooms,
                      idleLoomsCount: liveTotals.idleLooms,
                      totalShiftMeters: liveTotals.totalShiftMeters,
                      totalShiftKg: liveTotals.totalShiftKg,
                      totalWastageKg: parseFloat(totalWastageKg) || 0,
                      averageEfficiency: liveTotals.averageEfficiency,
                      totalBreakdownMins: liveTotals.totalBreakdownMins,
                      intervalTotals: [],
                    },
                    filterActiveOnly: false,
                  })
                }
                className="p-1.5 text-emerald-700 hover:text-emerald-800 border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs cursor-pointer"
                title="Export Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setResetModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg hover:bg-rose-50 shadow-2xs cursor-pointer"
                title="Reset Sheet"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Date & Shift Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 text-slate-400" />
              <span>Date:</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full min-w-0 px-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white"
              />
              <button
                type="button"
                onClick={() => handleDateChange(new Date().toISOString().slice(0, 10))}
                className="px-1.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 rounded-lg border border-slate-200 shrink-0 cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 text-slate-400" />
              <span>Shift:</span>
            </label>
            <select
              value={selectedShift}
              onChange={(e) => handleShiftChange(e.target.value)}
              className="w-full px-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white truncate cursor-pointer"
            >
              {shiftOptions.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile 2x2 KPI Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Running Looms</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-emerald-700 font-mono">
                {liveTotals.runningLooms}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">/ 91 Active</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Shift Output</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-slate-900 font-mono">
                {liveTotals.totalShiftMeters.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">m</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Avg Efficiency</span>
              <Gauge className="h-3 w-3 text-sky-500" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span
                className={`text-xl font-extrabold font-mono ${
                  liveTotals.averageEfficiency >= 85
                    ? "text-emerald-600"
                    : liveTotals.averageEfficiency >= 70
                    ? "text-amber-600"
                    : "text-slate-900"
                }`}
              >
                {liveTotals.averageEfficiency}%
              </span>
              <span className="text-[10px] text-slate-400 font-medium">speed</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Breakdown & Waste</span>
              <Timer className="h-3 w-3 text-amber-500" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-xl font-extrabold text-amber-700 font-mono">
                {liveTotals.totalBreakdownMins}m
              </span>
              <span className="text-[10px] text-rose-600 font-medium font-mono">
                / {totalWastageKg || "0"}kg
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Progressive Interval Strip */}
        <div className="bg-sky-50/70 border border-sky-200/70 rounded-xl p-2.5 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-bold tracking-wide uppercase text-[10px] text-sky-900">
              Progressive Interval Meters:
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono no-scrollbar">
            {timeSlots.map((slot, idx) => {
              const prog = liveTotals.progressiveTotals[idx] || 0;
              return (
                <div key={slot} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-sky-200 shrink-0 shadow-2xs">
                  <span className="text-slate-500 font-medium text-[10px]">{slot}:</span>
                  <span className="font-bold text-sky-700">{prog.toLocaleString()}m</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Search & Filters Toolbar */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search loom #, operator, quality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-800 shadow-2xs"
            />
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => {
                setFilterActiveOnly(false);
                setStatusFilter("ALL");
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 cursor-pointer ${
                statusFilter === "ALL" && !filterActiveOnly
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => {
                setFilterActiveOnly(true);
                setStatusFilter("ALL");
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 cursor-pointer ${
                statusFilter === "ALL" && filterActiveOnly
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"
              }`}
            >
              Active ({entries.filter((e) => isLoomActive(e)).length})
            </button>
            <button
              onClick={() => {
                setFilterActiveOnly(false);
                setStatusFilter("RUNNING");
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 cursor-pointer ${
                statusFilter === "RUNNING"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              Running ({liveTotals.runningLooms})
            </button>
            <button
              onClick={() => {
                setFilterActiveOnly(false);
                setStatusFilter("STOP");
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 cursor-pointer ${
                statusFilter === "STOP"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
              }`}
            >
              Stopped ({liveTotals.idleLooms})
            </button>
            <button
              onClick={() => {
                setFilterActiveOnly(false);
                setStatusFilter("CHANGEOVER");
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all shrink-0 cursor-pointer ${
                statusFilter === "CHANGEOVER"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
              }`}
            >
              C/O
            </button>
          </div>

          {/* Loom Count and Expand / Collapse All buttons */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
            <span className="font-bold text-slate-800">
              {filteredEntries.length} Looms Recorded
            </span>
            <div className="flex items-center gap-2 font-medium">
              <button
                onClick={expandAllLooms}
                className="text-sky-600 hover:text-sky-800 cursor-pointer font-semibold"
              >
                Expand All
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={collapseAllLooms}
                className="text-slate-600 hover:text-slate-800 cursor-pointer font-semibold"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Loom Cards List */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2.5 shadow-2xs">
              <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
              <span className="font-medium text-slate-600">Loading Circular Loom 2-Hours Reading Sheet...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500 space-y-2 shadow-2xs">
              <p className="font-medium">No circular looms found matching current filter.</p>
              {entries.length > 0 && filterActiveOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterActiveOnly(false);
                    setStatusFilter("ALL");
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                >
                  Show All {entries.length} Looms
                </button>
              )}
            </div>
          ) : (
            filteredEntries.map((e) => {
              const rowSeq = e.rowSequence || 1;
              const cardKey = `${e.loomNumber}-${rowSeq}`;
              const isExpanded = expandedLooms.has(cardKey);
              const isSplitRow = rowSeq > 1;

              const isInitialLocked = isSlotLocked(initialTimeSlot);
              const isR1Locked = isSlotLocked(timeSlots[0] || "10:00");
              const isR2Locked = isSlotLocked(timeSlots[1] || "12:00");
              const isR3Locked = isSlotLocked(timeSlots[2] || "14:00");
              const isR4Locked = isSlotLocked(timeSlots[3] || "16:00");
              const isR5Locked = isSlotLocked(timeSlots[4] || "18:00");
              const isR6Locked = isSlotLocked(timeSlots[5] || "20:00");

              const intervals = [
                { label: `I/R (${initialTimeSlot})`, field: "initialReading" as const, val: e.initialReading, prod: null, locked: isInitialLocked },
                { label: timeSlots[0] || "10:00", field: "r1Reading" as const, val: e.r1Reading, prod: e.r1Prod, locked: isR1Locked },
                { label: timeSlots[1] || "12:00", field: "r2Reading" as const, val: e.r2Reading, prod: e.r2Prod, locked: isR2Locked },
                { label: timeSlots[2] || "14:00", field: "r3Reading" as const, val: e.r3Reading, prod: e.r3Prod, locked: isR3Locked },
                { label: timeSlots[3] || "16:00", field: "r4Reading" as const, val: e.r4Reading, prod: e.r4Prod, locked: isR4Locked },
                { label: timeSlots[4] || "18:00", field: "r5Reading" as const, val: e.r5Reading, prod: e.r5Prod, locked: isR5Locked },
                { label: timeSlots[5] || "20:00", field: "r6Reading" as const, val: e.r6Reading, prod: e.r6Prod, locked: isR6Locked },
              ];

              return (
                <div
                  key={cardKey}
                  id={`loom-card-${cardKey}`}
                  className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden transition-all"
                >
                  {/* Collapsed Card Header */}
                  <div
                    onClick={() => toggleExpandLoom(cardKey)}
                    className="p-3 cursor-pointer flex items-center justify-between gap-2 transition-colors hover:bg-slate-50/80"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-1 text-xs font-black font-mono rounded-lg border shrink-0 ${
                          e.status === "RUNNING"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : e.status === "STOP"
                            ? "bg-rose-50 text-rose-800 border-rose-300"
                            : e.status === "CLEANING"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : e.status === "CHANGEOVER"
                            ? "bg-amber-100 text-amber-900 border-amber-400"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        #{e.loomNumber}{isSplitRow ? ` (${rowSeq})` : ""}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {e.operatorName || "Unassigned"}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase ${
                              e.status === "RUNNING"
                                ? "bg-emerald-100 text-emerald-800"
                                : e.status === "STOP"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {e.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {e.qualityType || "No Quality"} • {e.size ? `${e.size}mm` : "-"} / {e.denier ? `${e.denier}D` : "-"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-blue-900">
                          {e.totalProduction > 0 ? `${e.totalProduction.toLocaleString()} m` : "0 m"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {e.efficiencyPct ? `${e.efficiencyPct}% eff` : "0% eff"}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Card Body */}
                  {isExpanded && (
                    <div className="p-3 pt-0 border-t border-slate-100 space-y-3 bg-slate-50/30">
                      {/* Operator & Machine Status */}
                      <div className="pt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Operator:</label>
                          <select
                            value={e.operatorName || ""}
                            onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "operatorName", ev.target.value)}
                            onBlur={() => triggerAutoSave(true)}
                            className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none font-medium truncate cursor-pointer"
                          >
                            <option value="">-- Unassigned --</option>
                            {(data?.availableOperators || []).map((op) => (
                              <option key={op.id || op.name} value={op.name}>
                                {op.name}
                              </option>
                            ))}
                            {e.operatorName &&
                              !(data?.availableOperators || []).some(
                                (op) => op.name.toLowerCase() === e.operatorName?.toLowerCase()
                              ) && <option value={e.operatorName}>{e.operatorName}</option>}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Machine Status:</label>
                          <select
                            value={e.status}
                            onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "status", ev.target.value)}
                            onBlur={() => triggerAutoSave(true)}
                            className={`w-full text-xs font-bold px-2 py-1.5 rounded-lg border outline-none cursor-pointer ${
                              e.status === "RUNNING"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : e.status === "STOP"
                                ? "bg-rose-50 text-rose-800 border-rose-300"
                                : e.status === "CLEANING"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : e.status === "CHANGEOVER"
                                ? "bg-amber-100 text-amber-900 border-amber-400"
                                : "bg-slate-100 text-slate-600 border-slate-300"
                            }`}
                          >
                            <option value="RUNNING">RUN</option>
                            <option value="STOP">STOP</option>
                            <option value="CLEANING">CLEAN</option>
                            <option value="CHANGEOVER">C/O</option>
                            <option value="IDLE">IDLE</option>
                          </select>
                        </div>
                      </div>

                      {/* Photo & Notes Row */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPhotoModalEntry(e)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                            e.photoUrl
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {e.photoUrl ? (
                            <>
                              <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Photo (1)</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-3.5 w-3.5 text-slate-400" />
                              <span>+ Photo</span>
                            </>
                          )}
                        </button>

                        <input
                          type="text"
                          value={e.remarks || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "remarks", ev.target.value)}
                          onBlur={() => triggerAutoSave(true)}
                          placeholder="Notes / comments..."
                          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                        />

                        {isSplitRow && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSplitRow(e.loomNumber, rowSeq)}
                            className="p-1.5 rounded-lg text-rose-500 bg-rose-50 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                            title="Remove split row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Interval Readings Touch Grid */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Bi-Hourly Meter Readings (Meters)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {intervals.map((item, iIdx) => (
                            <div
                              key={item.label}
                              className={`p-2 rounded-xl border ${
                                item.locked ? "bg-slate-100/70 border-slate-200" : "bg-white border-slate-200/90 shadow-2xs"
                              } space-y-1`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                <span className="truncate">{item.label}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {item.locked && <Lock className="h-2.5 w-2.5 text-slate-400" />}
                                  {item.prod !== null && item.prod > 0 && (
                                    <span className="text-emerald-700 font-mono font-bold">+{item.prod}m</span>
                                  )}
                                </div>
                              </div>
                              <input
                                type="number"
                                disabled={item.locked}
                                readOnly={item.locked}
                                value={item.val !== null && item.val !== undefined ? item.val : ""}
                                onChange={(ev) =>
                                  handleEntryChange(
                                    e.loomNumber,
                                    rowSeq,
                                    item.field,
                                    ev.target.value === "" ? null : parseFloat(ev.target.value)
                                  )
                                }
                                onBlur={() => triggerAutoSave(true)}
                                placeholder="0"
                                className={`w-full px-2 py-1 text-xs text-right font-mono font-bold rounded-lg border outline-none transition-all ${
                                  item.locked
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                    : "bg-slate-50 text-slate-900 border-slate-200 focus:bg-white focus:border-slate-800"
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Breakdown / Downtime Drawer */}
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between">
                          <span>Breakdown & Downtime</span>
                          <Timer className="h-3 w-3 text-amber-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Reason:</label>
                            <select
                              value={e.breakdownReason || ""}
                              onChange={(ev) => handleEntryChange(e.loomNumber, rowSeq, "breakdownReason", ev.target.value || null)}
                              onBlur={() => triggerAutoSave(true)}
                              className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-amber-300 rounded-lg outline-none cursor-pointer"
                            >
                              <option value="">No Breakdown</option>
                              {LOOM_BREAKDOWN_REASONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Downtime (Mins):</label>
                            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-amber-300 rounded-lg">
                              <input
                                type="number"
                                min="0"
                                max="720"
                                value={e.breakdownMinutes !== null && e.breakdownMinutes !== undefined ? e.breakdownMinutes : ""}
                                onChange={(ev) =>
                                  handleEntryChange(
                                    e.loomNumber,
                                    rowSeq,
                                    "breakdownMinutes",
                                    ev.target.value === "" ? 0 : Math.max(0, parseInt(ev.target.value, 10) || 0)
                                  )
                                }
                                onBlur={() => triggerAutoSave(true)}
                                placeholder="0"
                                className="w-full text-xs text-right font-mono font-bold text-amber-950 outline-none"
                              />
                              <span className="text-[10px] font-bold text-amber-700">m</span>
                            </div>
                          </div>
                        </div>

                        {/* Changeover Target Quality */}
                        {(e.breakdownReason === "Change Over" || e.changeoverTargetQuality) && (
                          <div className="pt-1.5 border-t border-amber-200/60 space-y-1.5">
                            <label className="block text-[10px] font-bold text-amber-900">Target Changeover Quality:</label>
                            <UniversalQualityInput
                              value={e.changeoverTargetQuality || ""}
                              onChange={(newCode) => {
                                handleEntryChange(e.loomNumber, rowSeq, "changeoverTargetQuality", newCode || null);
                                triggerAutoSave(true);
                              }}
                              options={data?.availableQualities || []}
                              placeholder="Select new quality..."
                              compact={true}
                              inputClassName="h-8 text-xs font-bold text-amber-950 border-amber-300 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddSplitRow(e.loomNumber)}
                              className="w-full py-1.5 px-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Split Row for New Quality</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Official Sign-off Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Official Shift Approvals
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Prepared By:</label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                onBlur={() => triggerAutoSave(true)}
                placeholder="Loom Shed In-Charge"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Checked By:</label>
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                onBlur={() => triggerAutoSave(true)}
                placeholder="Shift Supervisor"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Approved By:</label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                onBlur={() => triggerAutoSave(true)}
                placeholder="Plant Manager"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium focus:bg-white"
              />
            </div>
          </div>

          <button
            onClick={() => handleSaveSheet("SUBMITTED")}
            disabled={saving || autoSaving}
            className="w-full py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>{saving && sheetStatus === "SUBMITTED" ? "Submitting..." : "Submit Reading Sheet"}</span>
          </button>
        </div>
      </div>

      {/* Bulk Operator Assign Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Assign Operator Range</h3>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Apply operator name and specifications across a range of circular loom machines in one action.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Loom #:</label>
                <input
                  type="number"
                  min="1"
                  max="91"
                  value={bulkStartLoom}
                  onChange={(e) => setBulkStartLoom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Loom #:</label>
                <input
                  type="number"
                  min="1"
                  max="91"
                  value={bulkEndLoom}
                  onChange={(e) => setBulkEndLoom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Operator (from Data Centre):</label>
              <select
                value={bulkOperator}
                onChange={(e) => setBulkOperator(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800 font-medium cursor-pointer"
              >
                <option value="">-- Choose Plant Operator --</option>
                {(data?.availableOperators || []).map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name} {o.employeeCode ? `(${o.employeeCode})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quality / Recipe (Optional):</label>
              <UniversalQualityInput
                value={bulkQuality}
                onChange={(val, opt) => {
                  setBulkQuality(val);
                  const found = opt || (data?.availableQualities || []).find((q) => q.code === val);
                  if (found) {
                    setBulkSize(found.size ? String(found.size).replace("mm", "") : (found.reedSpaceCm ? String(found.reedSpaceCm * 10) : ""));
                    setBulkDenier(found.denier ? String(found.denier) : "");
                  }
                }}
                options={data?.availableQualities || []}
                placeholder="— Leave Unchanged / Select Quality —"
                inputClassName="h-9 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Size (mm):</label>
                <input
                  type="text"
                  value={bulkSize}
                  onChange={(e) => setBulkSize(e.target.value)}
                  placeholder="Auto / mm"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Denier (DNR):</label>
                <input
                  type="text"
                  value={bulkDenier}
                  onChange={(e) => setBulkDenier(e.target.value)}
                  placeholder="Auto / DNR"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAssign}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Sheet Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Reset 2-Hours Sheet?</h3>
            </div>
            <p className="text-xs text-slate-600">
              This will erase all recorded bi-hourly readings for <strong>{selectedDate}</strong> ({selectedShift}).
              The sheet will return to a clean blank state.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetSheet}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Yes, Reset Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Print Preview Modal */}
      <LoomReadingPrintPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        date={selectedDate}
        shiftName={selectedShift}
        preparedBy={preparedBy}
        checkedBy={checkedBy}
        approvedBy={approvedBy}
        timeSlots={timeSlots}
        initialTimeSlot={initialTimeSlot}
        entries={filteredEntries}
        kpis={{
          totalLooms: 91,
          runningLoomsCount: liveTotals.runningLooms,
          idleLoomsCount: liveTotals.idleLooms,
          totalShiftMeters: liveTotals.totalShiftMeters,
          totalShiftKg: liveTotals.totalShiftKg,
          totalWastageKg: parseFloat(totalWastageKg) || 0,
          averageEfficiency: liveTotals.averageEfficiency,
          totalBreakdownMins: liveTotals.totalBreakdownMins,
        }}
        filterActiveOnly={filterActiveOnly}
        isFiltered={isFiltered}
        filterLabel={filterLabel}
      />

      {/* Physical Meter Counter Photo Evidence Modal */}
      {photoModalEntry && (
        <PhotoEvidenceModal
          isOpen={true}
          onClose={() => setPhotoModalEntry(null)}
          title={`Meter Counter Photo — Loom #${photoModalEntry.loomNumber} (${selectedDate} - ${selectedShift})`}
          timeSlot={`${selectedShift} Meter`}
          currentPhotoUrl={photoModalEntry.photoUrl || undefined}
          allowUpload={canUploadPhoto}
          allowCapture={canCapturePhoto}
          disabled={false}
          onSavePhoto={(url) => {
            handleEntryChange(photoModalEntry.loomNumber, photoModalEntry.rowSequence || 1, "photoUrl", url);
            setPhotoModalEntry(null);
            showNotification(`Photo attached to Loom #${photoModalEntry.loomNumber}`);
            triggerAutoSave(true);
          }}
          onRemovePhoto={() => {
            handleEntryChange(photoModalEntry.loomNumber, photoModalEntry.rowSequence || 1, "photoUrl", null);
            setPhotoModalEntry(null);
            showNotification(`Photo removed from Loom #${photoModalEntry.loomNumber}`);
            triggerAutoSave(true);
          }}
        />
      )}
    </div>
  );
}
