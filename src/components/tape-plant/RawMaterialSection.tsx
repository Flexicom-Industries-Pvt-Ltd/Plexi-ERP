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
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";
import { OperatorSelect } from "./OperatorSelect";
import { PhotoEvidenceModal } from "./PhotoEvidenceModal";
import { canUserOverrideLock } from "@/lib/tape-plant/telemetry-time-slots";

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

  const handleAddRow = () => {
    setRecords([
      ...records,
      {
        material: "New Material",
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
  };

  const handleUpdateRowPhoto = (idx: number, photoUrl: string | undefined) => {
    const updated = [...records];
    updated[idx] = { ...updated[idx], photoUrl };
    setRecords(updated);
  };

  const totalConsumption = records.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalWastage = records.reduce((sum, r) => sum + (Number(r.wastage) || 0), 0);

  // Column definitions with Photo evidence
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
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">4. Raw Material Movement</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                Material Inventory
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Opening, received, consumption, closing stock and setting percentages for {shiftName} ({date}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <OperatorSelect
            value={operatorName}
            operatorId={operatorId}
            onChange={(name, id) => {
              setOperatorName(name);
              setOperatorId(id || "");
            }}
            section="TAPE_PLANT"
          />

          {/* Auto-save Status Indicator */}
          {autoSaving ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium rounded-lg h-8">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="hidden sm:inline">Auto-saving...</span>
            </div>
          ) : lastAutoSavedAt ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg h-8">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">
                Auto-saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ) : null}

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
      </div>

      {/* Policy & RBAC Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/90 border border-slate-200/80 rounded-lg text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
          <span>
            <strong>Audit Evidence Policy:</strong> Attach physical scale weight and polymer bag lot evidence.
            {isSupervisor
              ? " Supervisors are provisioned with both file upload and live camera capture."
              : " Operators are restricted to live camera capture to enforce physical presence at scales."}
          </span>
        </div>
        {isSupervisor ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-[11px] font-medium">
            <ShieldCheck className="h-3 w-3" />
            <span>Supervisor: Upload + Camera</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[11px] font-medium">
            <Camera className="h-3 w-3" />
            <span>Operator: Live Camera Only</span>
          </div>
        )}
      </div>

      {/* Spreadsheet Table */}
      <SpreadsheetTable<RawMaterialRow>
        title="Raw Material Consumption & Inventory Position"
        subtitle="Automatic calculation of Total and Closing stock. Click any cell to edit."
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

      {/* Photo Evidence Modal */}
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
    </div>
  );
}
