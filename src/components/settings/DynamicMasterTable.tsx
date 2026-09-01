"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { ModelConfig } from "@/lib/config/master-data";
import { DynamicFormModal } from "./DynamicFormModal";
import { toast } from "sonner";

interface Props {
  modelConfig: ModelConfig;
}

export function DynamicMasterTable({ modelConfig }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  
  // Delete states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/master-data/${modelConfig.modelName}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
    } catch (error) {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [modelConfig.modelName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/settings/master-data/${modelConfig.modelName}/${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete record");
      }
      toast.success("Record deleted successfully");
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (record: any) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  // Filter data based on search and visible fields
  const visibleFields = modelConfig.fields.filter(f => !f.hiddenInTable);
  const filteredData = data.filter(record => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return visibleFields.some(field => {
      const val = record[field.key];
      return val && String(val).toLowerCase().includes(searchLower);
    });
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{modelConfig.title}</h2>
          <p className="text-sm text-slate-500">{modelConfig.description}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium text-sm rounded-lg hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add New
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                {visibleFields.map((field) => (
                  <th key={field.key} className="px-4 py-3 whitespace-nowrap">{field.label}</th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={visibleFields.length + 1} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-500">Loading records...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={visibleFields.length + 1} className="px-4 py-12 text-center">
                    <p className="text-slate-500 font-medium mb-1">No records found</p>
                    <p className="text-slate-400 text-xs">Adjust your search or add a new record.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((record, idx) => (
                  <tr key={record.id || idx} className="hover:bg-slate-50/50 transition-colors">
                    {visibleFields.map((field) => (
                      <td key={field.key} className="px-4 py-3">
                        {field.type === "boolean" ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            record[field.key] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {record[field.key] ? "Active" : "Inactive"}
                          </span>
                        ) : field.type === "select" ? (
                          <span className="truncate max-w-[150px] inline-block" title={String(record[field.key] ?? "")}>
                            {field.key === "uomId" && record.uom
                              ? (record.uom.abbreviation || record.uom.name)
                              : field.options?.find((o) => o.value === record[field.key])?.label || record[field.key]}
                          </span>
                        ) : (
                          record[field.key]
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(record)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(record.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <DynamicFormModal
          modelConfig={modelConfig}
          initialData={editingRecord}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchData();
          }}
        />
      )}

      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Record</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this record? This action cannot be undone and may fail if it is in use.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
