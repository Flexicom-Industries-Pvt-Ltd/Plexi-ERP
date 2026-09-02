"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Loader2, ClipboardCheck } from "lucide-react";

export function HandoversClient() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [latestHandover, setLatestHandover] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shiftId, setShiftId] = useState("");
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [completedQty, setCompletedQty] = useState(0);
  const [pendingQty, setPendingQty] = useState(0);
  const [wipNotes, setWipNotes] = useState("");
  const [machineStatus, setMachineStatus] = useState("");
  const [qualityIssues, setQualityIssues] = useState("");
  const [scrapNotes, setScrapNotes] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setShifts(data);
        if (data.length) setShiftId(data[0].id);
      });
  }, []);

  const fetchHandovers = useCallback(async () => {
    if (!shiftId) return;
    setLoading(true);
    try {
      const [listRes, latestRes] = await Promise.all([
        fetch(`/api/production/handovers?shiftId=${shiftId}`),
        fetch(`/api/production/handovers?shiftId=${shiftId}&latest=true`),
      ]);
      if (listRes.ok) setHandovers(await listRes.json());
      if (latestRes.ok) {
        const latest = await latestRes.json();
        setLatestHandover(latest);
      }
    } catch {
      toast.error("Failed to load handovers");
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    fetchHandovers();
  }, [fetchHandovers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/production/handovers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          handoverDate,
          completedQty,
          pendingQty,
          wipNotes: wipNotes || null,
          machineStatus: machineStatus || null,
          qualityIssues: qualityIssues || null,
          scrapNotes: scrapNotes || null,
          remarks: remarks || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save handover");
      }
      toast.success("Shift handover recorded");
      setWipNotes("");
      setMachineStatus("");
      setQualityIssues("");
      setScrapNotes("");
      setRemarks("");
      setCompletedQty(0);
      setPendingQty(0);
      fetchHandovers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/production" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-2">
          <ArrowLeft className="h-4 w-4" /> Production
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Shift Handover</h1>
        <p className="text-sm text-slate-500 mt-1">
          Outgoing shift logs pending work, WIP, machine status, and quality issues for the incoming team.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Shift</label>
          <select
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
          >
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {latestHandover && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-blue-900">Incoming Shift — Latest Handover</h2>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            From {latestHandover.handedOverBy?.name ?? "—"} on {format(new Date(latestHandover.handoverDate), "dd MMM yyyy HH:mm")}
            {latestHandover.shift?.name ? ` · ${latestHandover.shift.name}` : ""}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-blue-600">Completed</p><p className="font-semibold">{latestHandover.completedQty}</p></div>
            <div><p className="text-xs text-blue-600">Pending</p><p className="font-semibold">{latestHandover.pendingQty}</p></div>
          </div>
          {latestHandover.wipNotes && <p className="text-sm mt-3"><span className="font-medium">WIP:</span> {latestHandover.wipNotes}</p>}
          {latestHandover.machineStatus && <p className="text-sm mt-1"><span className="font-medium">Machines:</span> {latestHandover.machineStatus}</p>}
          {latestHandover.qualityIssues && <p className="text-sm mt-1"><span className="font-medium">Quality:</span> {latestHandover.qualityIssues}</p>}
          {latestHandover.scrapNotes && <p className="text-sm mt-1"><span className="font-medium">Scrap:</span> {latestHandover.scrapNotes}</p>}
          {latestHandover.remarks && <p className="text-sm mt-1"><span className="font-medium">Remarks:</span> {latestHandover.remarks}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">End-of-Shift Handover Form</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input type="date" required className="w-full px-3 py-2 border rounded-lg text-sm" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Completed Qty</label>
              <input type="number" min={0} className="w-full px-3 py-2 border rounded-lg text-sm" value={completedQty} onChange={(e) => setCompletedQty(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pending Qty</label>
              <input type="number" min={0} className="w-full px-3 py-2 border rounded-lg text-sm" value={pendingQty} onChange={(e) => setPendingQty(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          {[
            { label: "WIP Notes", value: wipNotes, set: setWipNotes, rows: 2 },
            { label: "Machine Status", value: machineStatus, set: setMachineStatus, rows: 2 },
            { label: "Quality Issues", value: qualityIssues, set: setQualityIssues, rows: 2 },
            { label: "Scrap Notes", value: scrapNotes, set: setScrapNotes, rows: 2 },
            { label: "Remarks", value: remarks, set: setRemarks, rows: 2 },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
              <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={field.rows} value={field.value} onChange={(e) => field.set(e.target.value)} />
            </div>
          ))}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Handover
          </button>
        </form>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Handover History</h2>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : handovers.length === 0 ? (
            <p className="text-sm text-slate-400">No handovers recorded for this shift yet.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {handovers.map((h) => (
                <div key={h.id} className="border border-slate-100 rounded-lg p-4 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-slate-800">{format(new Date(h.handoverDate), "dd MMM yyyy HH:mm")}</span>
                    <span className="text-xs text-slate-500">{h.handedOverBy?.name}</span>
                  </div>
                  <p className="text-slate-600">Completed: {h.completedQty} · Pending: {h.pendingQty}</p>
                  {h.wipNotes && <p className="text-slate-500 mt-1 truncate">WIP: {h.wipNotes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
