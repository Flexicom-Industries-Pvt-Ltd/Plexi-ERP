"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  FlaskConical,
  Plus,
  CheckCircle,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Trash2,
  Printer,
  Boxes,
} from "lucide-react";
import dynamic from "next/dynamic";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";
import { OperatorSelect } from "./OperatorSelect";
import { PhotoEvidenceModal } from "./PhotoEvidenceModal";
import { canUserOverrideLock } from "@/lib/tape-plant/telemetry-time-slots";
import { useProductionRealtime } from "@/hooks/useProductionRealtime";
import { RealtimeSyncBadge } from "@/components/production/RealtimeSyncBadge";
import {
  normalizeTapeMaterialName,
  TAPE_MATERIAL_LDPE_040,
  TAPE_MATERIAL_MIXED_RP,
  TAPE_MATERIAL_NATURAL_RP,
  TAPE_MATERIAL_RP_WHITE,
  TAPE_MATERIAL_RP_YELLOW,
} from "@/lib/tape-plant/material-names";

const RawMaterialPrintPreviewModal = dynamic(
  () => import("./RawMaterialPrintPreviewModal").then((m) => m.RawMaterialPrintPreviewModal),
  { ssr: false }
);

export interface RawMaterialRow {
  id?: string;
  operatorName?: string;
  operatorId?: string;
  photoUrl?: string;
  material: string;
  grade: string;
  openingStock: number | string;
  received: number | string;
  total?: number | string;
  consumption: number | string;
  closingStock?: number | string;
  settingPercent: number | string;
  actualPercent: number | string;
  wastage: number | string;
}

const DEFAULT_MATERIALS: RawMaterialRow[] = [
  { material: "PP", grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: "CC", grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: TAPE_MATERIAL_LDPE_040, grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: "MB", grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: TAPE_MATERIAL_RP_WHITE, grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: TAPE_MATERIAL_RP_YELLOW, grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: TAPE_MATERIAL_MIXED_RP, grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: TAPE_MATERIAL_NATURAL_RP, grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
];

interface RawMaterialSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function serializeRawMaterialPayload(
  date: string,
  shiftId: string,
  operatorName: string,
  operatorId: string,
  records: RawMaterialRow[]
): string {
  return JSON.stringify({
    date,
    shiftId,
    operatorName: (operatorName || "").trim(),
    operatorId: (operatorId || "").trim(),
    records: records.map((r) => ({
      material: (r.material || "").trim(),
      grade: (r.grade || "").trim(),
      photoUrl: r.photoUrl || null,
      openingStock: r.openingStock ?? "",
      received: r.received ?? "",
      consumption: r.consumption ?? "",
      settingPercent: r.settingPercent ?? "",
      actualPercent: r.actualPercent ?? "",
      wastage: r.wastage ?? "",
    })),
  });
}

export function reconcileServerRawMaterialRows(
  localRows: RawMaterialRow[],
  incomingServerRows: RawMaterialRow[],
  activeCell: { material: string; field: string } | null
): RawMaterialRow[] {
  const serverMap = new Map<string, RawMaterialRow>();
  for (const s of incomingServerRows) {
    const m = (s.material || "").trim().toUpperCase();
    if (m) serverMap.set(m, s);
  }

  const localMap = new Map<string, RawMaterialRow>();
  for (const l of localRows) {
    const m = (l.material || "").trim().toUpperCase();
    if (m) localMap.set(m, l);
  }

  const allMaterials = new Set<string>();
  localRows.forEach((l) => {
    const m = (l.material || "").trim().toUpperCase();
    if (m) allMaterials.add(m);
  });
  incomingServerRows.forEach((s) => {
    const m = (s.material || "").trim().toUpperCase();
    if (m) allMaterials.add(m);
  });

  const merged: RawMaterialRow[] = [];

  for (const m of allMaterials) {
    const local = localMap.get(m);
    const server = serverMap.get(m);

    if (server && !local) {
      merged.push({ ...server });
      continue;
    }

    if (!server && local) {
      merged.push({ ...local });
      continue;
    }

    if (server && local) {
      const mergedRow: RawMaterialRow = {
        id: server.id || local.id,
        material: local.material || server.material,
        grade: server.grade !== undefined && server.grade !== null ? server.grade : local.grade,
        photoUrl: server.photoUrl !== undefined ? (server.photoUrl || undefined) : local.photoUrl,
        operatorName: server.operatorName || local.operatorName || "",
        operatorId: server.operatorId || local.operatorId || "",
        openingStock: server.openingStock ?? "",
        received: server.received ?? "",
        consumption: server.consumption ?? "",
        settingPercent: server.settingPercent ?? "",
        actualPercent: server.actualPercent ?? "",
        wastage: server.wastage ?? "",
      };

      // FOCUSED CELL ISOLATION
      if (activeCell && (activeCell.material || "").trim().toUpperCase() === m) {
        const fieldKey = activeCell.field as keyof RawMaterialRow;
        if (fieldKey && fieldKey in local) {
          (mergedRow as any)[fieldKey] = (local as any)[fieldKey];
        }
      }

      merged.push(mergedRow);
    }
  }

  // Preserve order of DEFAULT_MATERIALS, then custom added materials
  const defaultKeys = DEFAULT_MATERIALS.map((d) => d.material.toUpperCase());
  merged.sort((a, b) => {
    const idxA = defaultKeys.indexOf((a.material || "").trim().toUpperCase());
    const idxB = defaultKeys.indexOf((b.material || "").trim().toUpperCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (a.material || "").localeCompare(b.material || "");
  });

  return merged;
}

export function RawMaterialSection({ date, shiftId, shiftName }: RawMaterialSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const isInitialLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef("");
  const lastUserEditTimeRef = useRef(0);
  const activeFocusedCellRef = useRef<{ material: string; field: string } | null>(null);
  const hasUnsavedLocalEditsRef = useRef(false);
  const deletedMaterialsRef = useRef<Set<string>>(new Set());
  const [operatorName, setOperatorName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [records, setRecords] = useState<RawMaterialRow[]>(DEFAULT_MATERIALS);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<number>>(new Set());

  // Auth & RBAC State
  const [userRole, setUserRole] = useState<string>("");
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [canUploadPhoto, setCanUploadPhoto] = useState<boolean>(true);
  const [canCapturePhoto, setCanCapturePhoto] = useState<boolean>(true);
  const isSupervisor = useMemo(() => {
    return canUserOverrideLock(userRole, userPermissions);
  }, [userRole, userPermissions]);

  // Photo Evidence Modal state
  const [photoModalRowIdx, setPhotoModalRowIdx] = useState<number | null>(null);

  // Fetch current user session to determine role & permissions (live check)
  const refreshUserPermissions = useCallback(() => {
    fetch("/api/auth/session", { cache: "no-store", headers: { Pragma: "no-cache", "Cache-Control": "no-cache" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!session?.user) return;
        const roleName = session.user.role || "";
        setUserRole(roleName);
        setUserPermissions(session.user.permissions || []);
        setCanUploadPhoto(Boolean(session.user.canUploadPhoto));
        setCanCapturePhoto(session.user.canCapturePhoto !== undefined ? Boolean(session.user.canCapturePhoto) : true);
      })
      .catch((err) => {
        console.warn("Could not determine user session for RBAC:", err);
      });
  }, []);

  useEffect(() => {
    refreshUserPermissions();
  }, [refreshUserPermissions]);

  // Re-fetch live session every time photo modal opens to ensure immediate sync
  useEffect(() => {
    if (photoModalRowIdx !== null) {
      refreshUserPermissions();
    }
  }, [photoModalRowIdx, refreshUserPermissions]);

  // Authoritative data fetch & Google Docs-style 3-way reconciliation
  const fetchAuthoritativeState = useCallback(async (force = false) => {
    if (!date || !shiftId) return;
    try {
      const res = await fetch(
        `/api/production/tape-plant/raw-material?date=${date}&shiftId=${shiftId}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        }
      );
      if (!res.ok) return;
      const data: any[] = await res.json();
      if (!data) return;

      const opName = (data && data[0]?.operatorName) || "";
      const opId = (data && data[0]?.operatorId) || "";
      if (opName) setOperatorName((prev) => prev || opName);
      if (opId) setOperatorId((prev) => prev || opId);

      const mapped: RawMaterialRow[] =
        data && data.length > 0
          ? data.map((d) => ({
              id: d.id,
              material: normalizeTapeMaterialName(d.material || ""),
              grade: d.grade || "",
              openingStock: d.openingStock ?? "",
              received: d.received ?? "",
              consumption: d.consumption ?? "",
              settingPercent: d.settingPercent ?? "",
              actualPercent: d.actualPercent ?? "",
              wastage: d.wastage ?? "",
              photoUrl: d.photoUrl || undefined,
              operatorName: d.operatorName || opName,
              operatorId: d.operatorId || opId,
            }))
          : DEFAULT_MATERIALS;

      setRecords((currentLocal) => {
        // If initial load or forced, replace local state directly
        if (!isInitialLoadedRef.current || force) {
          lastSavedPayloadRef.current = serializeRawMaterialPayload(
            date,
            shiftId,
            opName || operatorName,
            opId || operatorId,
            mapped
          );
          return mapped;
        }

        // Cell-level 3-way merge isolating actively focused cell typing
        const reconciled = reconcileServerRawMaterialRows(
          currentLocal,
          mapped,
          activeFocusedCellRef.current
        );

        // Filter out any locally deleted materials that have not landed yet
        const finalRecords = reconciled.filter(
          (r) => !deletedMaterialsRef.current.has((r.material || "").trim().toUpperCase())
        );

        // Update baseline snapshot only if user has no unsaved local edits
        if (!hasUnsavedLocalEditsRef.current) {
          lastSavedPayloadRef.current = serializeRawMaterialPayload(
            date,
            shiftId,
            opName || operatorName,
            opId || operatorId,
            finalRecords
          );
        }

        return finalRecords;
      });
    } catch (err) {
      console.warn("Authoritative raw material sync error:", err);
    }
  }, [date, shiftId, operatorName, operatorId]);

  // Initial load on date / shift change
  useEffect(() => {
    if (!date || !shiftId) return;
    isInitialLoadedRef.current = false;
    hasUnsavedLocalEditsRef.current = false;
    deletedMaterialsRef.current.clear();
    setLoading(true);

    fetchAuthoritativeState(true).finally(() => {
      setLoading(false);
      isInitialLoadedRef.current = true;
    });
  }, [date, shiftId, fetchAuthoritativeState]);

  // Google Docs-grade catch-up when tab/browser is minimized, backgrounded, or wakes up from sleep
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAuthoritativeState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [fetchAuthoritativeState]);

  const realtime = useProductionRealtime({
    module: "tape-plant",
    sheet: "raw-material",
    date,
    shift: shiftId,
    onSync: (event) => {
      if (!date || !shiftId) return;
      // Echo suppression: ignore broadcasts generated by our own client
      if (event?.clientId && event.clientId === realtime.clientId) return;
      fetchAuthoritativeState();
    },
  });

  // Debounced Auto-Save (only fires when local user made changes; avoids echo loops)
  useEffect(() => {
    if (!isInitialLoadedRef.current || !date || !shiftId) return;
    if (!hasUnsavedLocalEditsRef.current) return;

    const hasData = records.some((r) => r.material && r.material.trim() !== "");
    if (!hasData && deletedMaterialsRef.current.size === 0) return;

    const serialized = serializeRawMaterialPayload(date, shiftId, operatorName, operatorId, records);
    if (serialized === lastSavedPayloadRef.current && deletedMaterialsRef.current.size === 0) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const deletedMaterials = Array.from(deletedMaterialsRef.current);
        const payload = {
          date,
          shiftId,
          operatorName,
          operatorId,
          records: records.map((r) => ({
            ...r,
            photoUrl: r.photoUrl || null,
          })),
          deletedMaterials,
          clientId: realtime.clientId,
        };

        const res = await fetch("/api/production/tape-plant/raw-material", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          lastSavedPayloadRef.current = serialized;
          hasUnsavedLocalEditsRef.current = false;
          deletedMaterialsRef.current.clear();
          setLastAutoSavedAt(new Date());
          realtime.broadcastSync({ action: "SAVE", date, shift: shiftId });
        }
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setAutoSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [records, operatorName, operatorId, date, shiftId, realtime]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const deletedMaterials = Array.from(deletedMaterialsRef.current);
      const payload = {
        date,
        shiftId,
        operatorName,
        operatorId,
        records: records.map((r) => ({
          ...r,
          photoUrl: r.photoUrl || null,
        })),
        deletedMaterials,
        clientId: realtime.clientId,
      };

      const res = await fetch("/api/production/tape-plant/raw-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save raw materials");
      }

      lastSavedPayloadRef.current = serializeRawMaterialPayload(date, shiftId, operatorName, operatorId, records);
      hasUnsavedLocalEditsRef.current = false;
      deletedMaterialsRef.current.clear();
      setLastAutoSavedAt(new Date());
      realtime.broadcastSync({ action: "SAVE", date, shift: shiftId });
      toast.success("Raw material position & consumption saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save raw materials");
    } finally {
      setSaving(false);
    }
  };

  const toggleMaterialExpanded = (idx: number) => {
    setExpandedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedMaterials(new Set(records.map((_, i) => i)));
  };

  const handleCollapseAll = () => {
    setExpandedMaterials(new Set());
  };

  const handleFieldChange = (
    idx: number,
    field: keyof RawMaterialRow,
    rawVal: string,
    isNumber = true
  ) => {
    realtime.markLocalEdit();
    hasUnsavedLocalEditsRef.current = true;
    lastUserEditTimeRef.current = Date.now();
    const val = isNumber && rawVal !== "" ? (isNaN(Number(rawVal)) ? rawVal : Number(rawVal)) : rawVal;
    setRecords((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleDeleteRow = (idx: number) => {
    realtime.markLocalEdit();
    hasUnsavedLocalEditsRef.current = true;
    lastUserEditTimeRef.current = Date.now();
    const target = records[idx];
    if (target?.material) {
      deletedMaterialsRef.current.add(target.material.trim().toUpperCase());
    }
    setRecords((prev) => prev.filter((_, i) => i !== idx));
    setExpandedMaterials((prev) => {
      const next = new Set<number>();
      prev.forEach((val) => {
        if (val < idx) next.add(val);
        else if (val > idx) next.add(val - 1);
      });
      return next;
    });
  };

  const handleAddRow = () => {
    realtime.markLocalEdit();
    hasUnsavedLocalEditsRef.current = true;
    lastUserEditTimeRef.current = Date.now();
    const newIdx = records.length;
    setRecords([
      ...records,
      {
        material: `Material ${records.length + 1}`,
        grade: "",
        openingStock: "",
        received: "",
        consumption: "",
        settingPercent: "",
        actualPercent: "",
        wastage: "",
        photoUrl: undefined,
      },
    ]);
    setExpandedMaterials((prev) => new Set([...prev, newIdx]));
  };

  // Update photo for active row with immediate database persistence and cross-device sync
  const handleUpdateRowPhoto = async (idx: number, photoUrl: string | null | undefined) => {
    const cleanPhoto = photoUrl?.trim() || null;
    const updated = [...records];
    updated[idx] = { ...updated[idx], photoUrl: cleanPhoto || undefined };
    setRecords(updated);

    if (!date || !shiftId) return;

    const deletedMaterials = Array.from(deletedMaterialsRef.current);
    const payload = {
      date,
      shiftId,
      operatorName,
      operatorId,
      records: updated.map((r) => ({
        ...r,
        photoUrl: r.photoUrl || null,
      })),
      deletedMaterials,
      clientId: realtime.clientId,
    };

    const serialized = serializeRawMaterialPayload(date, shiftId, operatorName, operatorId, updated);
    lastSavedPayloadRef.current = serialized;
    hasUnsavedLocalEditsRef.current = false;
    deletedMaterialsRef.current.clear();

    try {
      const res = await fetch("/api/production/tape-plant/raw-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setLastAutoSavedAt(new Date());
        realtime.broadcastSync({ action: "PHOTO_UPDATE", date, shift: shiftId });
      }
    } catch (err) {
      console.error("Immediate photo save failed:", err);
    }
  };

  const totalConsumption = records.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalWastage = records.reduce((sum, r) => sum + (Number(r.wastage) || 0), 0);
  const totalReceived = records.reduce((sum, r) => sum + (Number(r.received) || 0), 0);

  // Column definitions for Desktop Spreadsheet
  const materialColumns: ColumnDef<RawMaterialRow>[] = useMemo(
    () => [
      { key: "material", label: "Raw Material", width: "130px", minWidth: 120, sticky: true },

      // Photo Evidence Column
      {
        key: "photoUrl",
        label: "Photo",
        width: "80px",
        minWidth: 75,
        align: "center",
        render: (_val, row, idx) => {
          const hasPhoto = Boolean(row.photoUrl);

          return (
            <button
              type="button"
              onClick={() => setPhotoModalRowIdx(idx)}
              className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                hasPhoto
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-xs"
                  : "bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary hover:bg-blue-50/40 cursor-pointer"
              }`}
              title={
                hasPhoto
                  ? "View / change evidence photo"
                  : isSupervisor
                  ? "Attach batch / scale evidence photo (Upload or Camera)"
                  : "Capture live batch photo (Camera required for operators)"
              }
            >
              {hasPhoto ? (
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
          );
        },
      },

      { key: "grade", label: "Grade", width: "130px", minWidth: 120, placeholder: "e.g. H110MA" },
      { key: "openingStock", label: "Opening (KG)", width: "120px", minWidth: 110, type: "number", align: "right", placeholder: "0.0" },
      { key: "received", label: "Received (KG)", width: "120px", minWidth: 110, type: "number", align: "right", placeholder: "0.0" },
      {
        key: "total",
        label: "Total (KG)",
        width: "120px",
        minWidth: 110,
        align: "right",
        calculate: (row) => {
          const open = Number(row.openingStock) || 0;
          const rec = Number(row.received) || 0;
          return (open + rec).toFixed(1);
        },
      },
      { key: "consumption", label: "Consumption (KG)", width: "140px", minWidth: 130, type: "number", align: "right", placeholder: "0.0" },
      {
        key: "closingStock",
        label: "Closing (KG)",
        width: "120px",
        minWidth: 110,
        align: "right",
        calculate: (row) => {
          const open = Number(row.openingStock) || 0;
          const rec = Number(row.received) || 0;
          const total = open + rec;
          const cons = Number(row.consumption) || 0;
          return (total - cons).toFixed(1);
        },
      },
      { key: "settingPercent", label: "Setting %", width: "100px", minWidth: 95, type: "number", align: "right", placeholder: "%" },
      { key: "actualPercent", label: "Actual %", width: "100px", minWidth: 95, type: "number", align: "right", placeholder: "%" },
      { key: "wastage", label: "Wastage (KG)", width: "110px", minWidth: 100, type: "number", align: "right", placeholder: "0.0" },
    ],
    [isSupervisor]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200 shadow-xs">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Raw Material Movement Log...</span>
      </div>
    );
  }

  const activePhotoRow = photoModalRowIdx !== null ? records[photoModalRowIdx] : null;

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs min-w-0">
        {/* Desktop Header Left */}
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">4. Raw Material Movement</h2>
            <p className="text-[11px] text-slate-500">Raw material stock balances, batch mixing &amp; consumption</p>
          </div>
        </div>

        {/* Desktop Header Controls */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <div className="flex-1 sm:flex-none min-w-[200px]">
            <OperatorSelect
              value={operatorName}
              operatorId={operatorId}
              onChange={(name, id) => {
                realtime.markLocalEdit();
                hasUnsavedLocalEditsRef.current = true;
                lastUserEditTimeRef.current = Date.now();
                setOperatorName(name);
                setOperatorId(id || "");
              }}
              section="TAPE_PLANT"
            />
          </div>

          {/* Desktop Auto-save Status Indicator */}
          <RealtimeSyncBadge
            isConnected={realtime.isConnected}
            lastUpdatedBy={realtime.lastUpdatedBy}
            lastUpdatedAt={realtime.lastUpdatedAt}
            lastAction={realtime.lastAction}
            isSelfUpdate={realtime.isSelfUpdate}
          />

          {autoSaving ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium rounded-lg h-8">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Auto-saving...</span>
            </div>
          ) : lastAutoSavedAt ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg h-8">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Auto-saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 h-8 cursor-pointer"
            title="Print / View Raw Material Report"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Log
          </button>
        </div>

        {/* ── Mobile Streamlined Header (< sm) — No Redundant Heading ── */}
        <div className="sm:hidden space-y-2.5 w-full">
          {/* Row 1: Operator Selector */}
          <div className="w-full">
            <OperatorSelect
              value={operatorName}
              operatorId={operatorId}
              onChange={(name, id) => {
                realtime.markLocalEdit();
                hasUnsavedLocalEditsRef.current = true;
                lastUserEditTimeRef.current = Date.now();
                setOperatorName(name);
                setOperatorId(id || "");
              }}
              section="TAPE_PLANT"
            />
          </div>

          {/* Row 2: Auto-save status & Balanced Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div>
              {autoSaving ? (
                <span className="p-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs inline-flex items-center gap-1" title="Auto-saving...">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-[11px] font-medium text-slate-600">Saving...</span>
                </span>
              ) : lastAutoSavedAt ? (
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs inline-flex items-center gap-1" title="Auto-saved">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium text-emerald-700">Saved</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">Logged</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Print / View Report"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span>Print</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Toolbar (Expand All / Collapse All on < md) ── */}
      <div className="flex md:hidden items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-900">{records.length}</span>
          <span>Materials Tracked</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="text-xs text-slate-500 hover:underline font-medium cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Mobile Raw Material Cards (< md) ── */}
      <div className="flex md:hidden flex-col gap-3">
        {records.map((row, idx) => {
          const isExpanded = expandedMaterials.has(idx);
          const open = Number(row.openingStock) || 0;
          const rec = Number(row.received) || 0;
          const avail = open + rec;
          const cons = Number(row.consumption) || 0;
          const close = avail - cons;

          return (
            <div
              key={idx}
              id={`material-card-${idx}`}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
            >
              {/* Card Header (Tap to expand/collapse) */}
              <div
                onClick={() => toggleMaterialExpanded(idx)}
                className={`flex items-center justify-between p-3 cursor-pointer select-none transition-colors ${
                  isExpanded ? "bg-slate-50/80 border-b border-slate-200" : "bg-white hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-xs shrink-0 tracking-wide">
                    {row.material || `Item #${idx + 1}`}
                  </span>

                  {row.grade && (
                    <span className="text-xs font-semibold text-slate-500 truncate">
                      {row.grade}
                    </span>
                  )}

                  {/* Quick Summary Pill */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    <span>Cons:</span>
                    <strong className="text-emerald-700 font-mono">{cons.toFixed(1)} KG</strong>
                  </span>

                  {/* Photo Indicator */}
                  {row.photoUrl && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      <ImageIcon className="h-2.5 w-2.5 text-emerald-600" />
                      <span>Photo</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Expand / Collapse Chevron */}
                  <div className="p-1 text-slate-400">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              {isExpanded && (
                <div className="p-3.5 space-y-3.5 bg-white">
                  {/* Material Controls (Photo Evidence, Delete) */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Boxes className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">{row.material}</span>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {/* Photo Evidence Button */}
                      <button
                        type="button"
                        onClick={() => setPhotoModalRowIdx(idx)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                          row.photoUrl
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-300 hover:border-primary hover:text-primary hover:bg-blue-50/40"
                        }`}
                      >
                        {row.photoUrl ? (
                          <>
                            <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Photo Attached</span>
                          </>
                        ) : (
                          <>
                            <Camera className="h-3.5 w-3.5 text-slate-400" />
                            <span>+ Photo Evidence</span>
                          </>
                        )}
                      </button>

                      {/* Delete Material Row */}
                      {records.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Material Row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Photo Evidence Preview Card (if attached) */}
                  {row.photoUrl && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.photoUrl}
                          alt="Evidence"
                          className="w-10 h-10 object-cover rounded-md border border-emerald-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-emerald-900 block truncate">Evidence Photo Attached</span>
                          <span className="text-[10px] text-emerald-700">Tap view/edit to inspect or update</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotoModalRowIdx(idx)}
                        className="text-xs font-bold text-emerald-800 hover:underline px-2 py-1 shrink-0"
                      >
                        View / Edit
                      </button>
                    </div>
                  )}

                  {/* Section 1: Stock Movement (KG) */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-bold text-emerald-900 tracking-tight">Stock Movement &amp; Consumption</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200">
                        KG
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-emerald-950/70 block truncate">Opening Stock</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={row.openingStock}
                          onFocus={() => {
                            activeFocusedCellRef.current = { material: row.material, field: "openingStock" };
                          }}
                          onBlur={() => {
                            activeFocusedCellRef.current = null;
                          }}
                          onChange={(e) => handleFieldChange(idx, "openingStock", e.target.value)}
                          placeholder="0.0"
                          className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 text-right"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-emerald-950/70 block truncate">Received (KG)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={row.received}
                          onFocus={() => {
                            activeFocusedCellRef.current = { material: row.material, field: "received" };
                          }}
                          onBlur={() => {
                            activeFocusedCellRef.current = null;
                          }}
                          onChange={(e) => handleFieldChange(idx, "received", e.target.value)}
                          placeholder="0.0"
                          className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 text-right"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 block truncate">Total Available</label>
                        <div className="w-full text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-right font-mono">
                          {avail.toFixed(1)}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-emerald-800 block truncate">Consumption (KG)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={row.consumption}
                          onFocus={() => {
                            activeFocusedCellRef.current = { material: row.material, field: "consumption" };
                          }}
                          onBlur={() => {
                            activeFocusedCellRef.current = null;
                          }}
                          onChange={(e) => handleFieldChange(idx, "consumption", e.target.value)}
                          placeholder="0.0"
                          className="w-full text-xs font-extrabold text-emerald-800 bg-emerald-50/50 border border-emerald-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 text-right"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 block truncate">Closing Stock</label>
                        <div className="w-full text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-right font-mono">
                          {close.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Batch Proportions & Wastage */}
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-xs font-bold text-amber-900 tracking-tight">Batch Proportions &amp; Wastage</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200">
                        % / KG
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-amber-950/70 block truncate">Grade</label>
                        <input
                          type="text"
                          value={row.grade}
                          onFocus={() => {
                            activeFocusedCellRef.current = { material: row.material, field: "grade" };
                          }}
                          onBlur={() => {
                            activeFocusedCellRef.current = null;
                          }}
                          onChange={(e) => handleFieldChange(idx, "grade", e.target.value, false)}
                          placeholder="e.g. H110MA"
                          className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-amber-500 text-left"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-amber-950/70 block truncate">Setting %</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={row.settingPercent}
                          onFocus={() => {
                            activeFocusedCellRef.current = { material: row.material, field: "settingPercent" };
                          }}
                          onBlur={() => {
                            activeFocusedCellRef.current = null;
                          }}
                          onChange={(e) => handleFieldChange(idx, "settingPercent", e.target.value)}
                          placeholder="%"
                          className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-amber-500 text-right"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-amber-950/70 block truncate">Actual %</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={row.actualPercent}
                          onFocus={() => {
                            activeFocusedCellRef.current = { material: row.material, field: "actualPercent" };
                          }}
                          onBlur={() => {
                            activeFocusedCellRef.current = null;
                          }}
                          onChange={(e) => handleFieldChange(idx, "actualPercent", e.target.value)}
                          placeholder="%"
                          className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-amber-500 text-right"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-rose-800 block truncate">Wastage (KG)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={row.wastage}
                          onFocus={() => {
                            activeFocusedCellRef.current = { material: row.material, field: "wastage" };
                          }}
                          onBlur={() => {
                            activeFocusedCellRef.current = null;
                          }}
                          onChange={(e) => handleFieldChange(idx, "wastage", e.target.value)}
                          placeholder="0.0"
                          className="w-full text-xs font-extrabold text-rose-800 bg-rose-50/50 border border-rose-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-rose-500 text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Mobile Add Material Button */}
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center justify-center gap-2 p-3.5 bg-white hover:bg-slate-50 border-2 border-dashed border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold transition-all active:scale-[0.99] cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4 text-emerald-600" />
          <span>+ Add Raw Material Row</span>
        </button>
      </div>

      {/* ── Desktop Spreadsheet Table (md+) ── */}
      <div className="hidden md:block">
        <SpreadsheetTable<RawMaterialRow>
          title="Raw Material Consumption & Inventory Position"
          columns={materialColumns}
          data={records}
          onChange={(newRecords) => {
            realtime.markLocalEdit();
            hasUnsavedLocalEditsRef.current = true;
            setRecords(newRecords);
          }}
          onCellFocus={(rowIndex, columnKey) => {
            activeFocusedCellRef.current = {
              material: records[rowIndex]?.material || "",
              field: columnKey,
            };
          }}
          onCellBlur={() => {
            activeFocusedCellRef.current = null;
          }}
          allowAddRow={true}
          onAddRow={handleAddRow}
          allowDeleteRow={true}
          onDeleteRow={handleDeleteRow}
          actions={
            <div className="flex items-center gap-4 text-xs font-bold text-slate-700 mr-2">
              <span>
                Total Consumption:{" "}
                <strong className="text-emerald-700 font-mono">{totalConsumption.toLocaleString()} KG</strong>
              </span>
              <span>
                Total Wastage:{" "}
                <strong className="text-red-600 font-mono">{totalWastage.toLocaleString()} KG</strong>
              </span>
            </div>
          }
        />
      </div>

      {/* ── Photo Evidence Modal ── */}
      {photoModalRowIdx !== null && activePhotoRow && (
        <PhotoEvidenceModal
          isOpen={true}
          onClose={() => setPhotoModalRowIdx(null)}
          title={`Raw Material Evidence — ${activePhotoRow.material} (${date})`}
          timeSlot={activePhotoRow.material}
          currentPhotoUrl={activePhotoRow.photoUrl}
          allowUpload={canUploadPhoto}
          allowCapture={canCapturePhoto}
          onSavePhoto={(url) => {
            handleUpdateRowPhoto(photoModalRowIdx, url);
            setPhotoModalRowIdx(null);
            toast.success(`Photo attached to ${activePhotoRow.material}`);
          }}
          onRemovePhoto={() => {
            handleUpdateRowPhoto(photoModalRowIdx, null);
            setPhotoModalRowIdx(null);
          }}
        />
      )}

      {/* ── Standard Print & Excel Preview Modal ── */}
      <RawMaterialPrintPreviewModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        date={date}
        shiftName={shiftName}
        operatorName={operatorName}
        status="SAVED"
        records={records}
      />
    </div>
  );
}
