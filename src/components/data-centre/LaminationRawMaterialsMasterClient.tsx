"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Percent,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LaminationRawMaterialItem } from "@/lib/lamination/lamination-raw-material-types";

export function LaminationRawMaterialsClient() {
  const [items, setItems] = useState<LaminationRawMaterialItem[]>([]);
  const [totalPercentage, setTotalPercentage] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LaminationRawMaterialItem | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [percentage, setPercentage] = useState("");
  const [unit, setUnit] = useState("kg");
  const [sequence, setSequence] = useState("1");
  const [isActive, setIsActive] = useState(true);
  const [remarks, setRemarks] = useState("");

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/data-centre/lamination-raw-materials");
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setTotalPercentage(data.totalPercentage || 0);
      } else {
        toast.error(data.error || "Failed to load raw materials");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error loading raw materials");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setName("");
    setCode("");
    // Default next percentage or sequence
    const nextSeq = items.length > 0 ? Math.max(...items.map((i) => i.sequence || 0)) + 1 : 1;
    setSequence(String(nextSeq));
    setPercentage("");
    setUnit("kg");
    setIsActive(true);
    setRemarks("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: LaminationRawMaterialItem) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code || "");
    setPercentage(String(item.percentage));
    setUnit(item.unit || "kg");
    setSequence(String(item.sequence || 1));
    setIsActive(item.isActive);
    setRemarks(item.remarks || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Raw Material Name is required");
      return;
    }
    const numPercent = parseFloat(percentage);
    if (isNaN(numPercent) || numPercent < 0 || numPercent > 100) {
      toast.error("Percentage must be a valid number between 0 and 100");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          id: editingItem?.id,
          name: name.trim(),
          code: code.trim() || null,
          percentage: numPercent,
          unit: unit.trim() || "kg",
          sequence: parseInt(sequence, 10) || 1,
          isActive,
          remarks: remarks.trim() || null,
        };

        const res = await fetch("/api/data-centre/lamination-raw-materials", {
          method: editingItem ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(
            editingItem ? "Raw material updated successfully" : "Raw material added successfully"
          );
          setIsModalOpen(false);
          fetchItems();
        } else {
          toast.error(data.error || "Failed to save raw material");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error saving raw material");
      }
    });
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}"?`)) return;

    try {
      const res = await fetch(`/api/data-centre/lamination-raw-materials?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${itemName}" deleted`);
        fetchItems();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting item");
    }
  };

  const filteredItems = items.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      (i.code && i.code.toLowerCase().includes(q)) ||
      (i.remarks && i.remarks.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Recipe %
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {totalPercentage}%
              </h3>
            </div>
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                totalPercentage === 100
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              <Percent className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Materials
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {items.filter((i) => i.isActive).length}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status Validation
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {totalPercentage === 100 ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Exactly 100%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" /> {totalPercentage}% (Variance: {(100 - totalPercentage).toFixed(1)}%)
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchItems}
              disabled={isLoading}
              className="h-8 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search and Add */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search raw materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Button
          onClick={openAddModal}
          size="sm"
          className="h-9 px-3 text-xs bg-sky-600 hover:bg-sky-700 text-white font-medium"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Raw Material
        </Button>
      </div>

      {/* Raw Materials Master Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">Seq</th>
                <th className="py-2.5 px-3">Raw Material Name</th>
                <th className="py-2.5 px-3 w-28">Code / Grade</th>
                <th className="py-2.5 px-3 w-28 text-right">Usage %</th>
                <th className="py-2.5 px-3 w-20 text-center">Unit</th>
                <th className="py-2.5 px-3 w-24 text-center">Status</th>
                <th className="py-2.5 px-3">Remarks</th>
                <th className="py-2.5 px-3 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    Loading lamination raw materials...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No raw materials found. Click "Add Raw Material" to get started.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center font-medium text-slate-500">
                      {item.sequence}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {item.code || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-sky-700">
                      {item.percentage.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">
                      {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.isActive ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs text-[11px]">
                      {item.remarks || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(item)}
                          className="h-7 w-7 text-slate-600 hover:text-sky-600"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="h-7 w-7 text-slate-600 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 text-xs">
                  <td colSpan={3} className="py-2.5 px-3 text-center uppercase tracking-wider text-[11px]">
                    Total Configured Percentage
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-sky-700 text-sm">
                    {totalPercentage}%
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingItem ? "Edit Raw Material" : "Add Lamination Raw Material"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3.5 py-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Raw Material Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. PP Granules (Coating Grade)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Code / Grade
                </label>
                <Input
                  placeholder="e.g. PP-COAT"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standard Recipe % <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 60.0"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Sequence
                </label>
                <Input
                  type="number"
                  min="1"
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit
                </label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
              />
              <label htmlFor="isActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                Active in Recipe (Available for daily production entries)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Notes
              </label>
              <Input
                placeholder="Optional specifications..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
              >
                {isPending ? "Saving..." : editingItem ? "Update Material" : "Add Material"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
