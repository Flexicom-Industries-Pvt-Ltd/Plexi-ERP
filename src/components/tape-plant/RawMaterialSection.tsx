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
  { material: "MB", grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: "RP1", grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: "RP2", grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: "HD RP", grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
  { material: "TPT", grade: "", openingStock: "", received: "", consumption: "", settingPercent: "", actualPercent: "", wastage: "" },
];

interface RawMaterialSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function RawMaterialSection({ date, shiftId, shiftName }: RawMaterialSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const isInitialLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef("");
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

  useEffect(() => {
    if (!date || !shiftId) return;
    isInitialLoadedRef.current = false;
    setLoading(true);
    fetch(`/api/production/tape-plant/raw-material?date=${date}&shiftId=${shiftId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (data && data.length > 0) {
          const opName = data[0]?.operatorName || "";
          const opId = data[0]?.operatorId || "";
          setOperatorName(opName);
          setOperatorId(opId);
          const mapped: RawMaterialRow[] = data.map((d) => ({
            id: d.id,
            material: d.material || "",
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
          }));
          setRecords(mapped);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            operatorName: opName,
            operatorId: opId,
            records: mapped,
          });
        } else {
          setOperatorName("");
          setOperatorId("");
          setRecords(DEFAULT_MATERIALS);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            operatorName: "",
            operatorId: "",
            records: DEFAULT_MATERIALS,
          });
        }
      })
      .catch(() => toast.error("Failed to load raw materials"))
      .finally(() => {
        setLoading(false);
        isInitialLoadedRef.current = true;
      });
  }, [date, shiftId]);

  // Debounced Auto-Save
  useEffect(() => {
    if (!isInitialLoadedRef.current || !date || !shiftId) return;

    const hasData = records.some((r) => r.material && r.material.trim() !== "");
    if (!hasData) return;

    const payload = {
      date,
      shiftId,
      operatorName,
      operatorId,
      records,
    };

    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedPayloadRef.current) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const res = await fetch("/api/production/tape-plant/raw-material", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });
        if (res.ok) {
          lastSavedPayloadRef.current = serialized;
          setLastAutoSavedAt(new Date());
        }
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setAutoSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [records, operatorName, operatorId, date, shiftId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date,
        shiftId,
        operatorName,
        operatorId,
        records,
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

      lastSavedPayloadRef.current = JSON.stringify(payload);
      setLastAutoSavedAt(new Date());
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
    const val = isNumber && rawVal !== "" ? (isNaN(Number(rawVal)) ? rawVal : Number(rawVal)) : rawVal;
    setRecords((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleDeleteRow = (idx: number) => {
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

  const handleUpdateRowPhoto = (idx: number, photoUrl: string | undefined) => {
    const updated = [...records];
    updated[idx] = { ...updated[idx], photoUrl };
    setRecords(updated);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">4. Raw Material Movement</h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">Raw material stock balances, batch mixing &amp; consumption</p>
            </div>
          </div>

          {/* Mobile Top Actions (< sm) */}
          <div className="sm:hidden flex items-center gap-1.5">
            {autoSaving ? (
              <span className="p-1.5 bg-slate-100 text-slate-500 rounded-lg" title="Auto-saving...">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </span>
            ) : lastAutoSavedAt ? (
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg" title="Auto-saved">
                <CheckCircle className="h-3.5 w-3.5" />
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Print / View Report"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <div className="flex-1 sm:flex-none min-w-[200px]">
            <OperatorSelect
              value={operatorName}
              operatorId={operatorId}
              onChange={(name, id) => {
                setOperatorName(name);
                setOperatorId(id || "");
              }}
              section="TAPE_PLANT"
            />
          </div>

          {/* Desktop Auto-save Status Indicator */}
          <div className="hidden sm:inline-flex">
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
          </div>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 h-8 cursor-pointer"
            title="Print / View Raw Material Report"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Log
          </button>
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
          onChange={setRecords}
          allowAddRow={true}
          onAddRow={handleAddRow}
          allowDeleteRow={true}
          onDeleteRow={(idx) => setRecords(records.filter((_, i) => i !== idx))}
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
            handleUpdateRowPhoto(photoModalRowIdx, undefined);
            setPhotoModalRowIdx(null);
            toast.info("Photo removed");
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
