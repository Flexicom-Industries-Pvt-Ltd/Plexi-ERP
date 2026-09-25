"use client";

import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Save, Loader2, FlaskConical, Plus, CheckCircle } from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";
import { OperatorSelect } from "./OperatorSelect";

interface RawMaterialRow {
  id?: string;
  operatorName?: string;
  operatorId?: string;
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

const materialColumns: ColumnDef<RawMaterialRow>[] = [
  { key: "material", label: "Raw Material", width: "130px", minWidth: 120, sticky: true },
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
          setRecords(data);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            operatorName: opName,
            operatorId: opId,
            records: data,
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
      },
    ]);
  };

  const totalConsumption = records.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalWastage = records.reduce((sum, r) => sum + (Number(r.wastage) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Raw Material Log...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">4. Raw Material Movement</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Opening, received, consumption, closing stock and setting percentages for {shiftName} ({date}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
              <span className="hidden sm:inline">Auto-saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Log
          </button>
        </div>
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
    </div>
  );
}
