"use client";

import React, { useState, useEffect } from "react";
import {
  AvailableLaminationRoll,
  GroupedQualityRolls,
} from "@/lib/lamination/lamination-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Layers,
  Check,
  Plus,
  ArrowRight,
  Loader2,
  Package,
} from "lucide-react";

interface RollStockPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRolls: (rolls: AvailableLaminationRoll[]) => void;
  alreadyAddedRollNumbers?: string[];
}

export function RollStockPickerModal({
  open,
  onOpenChange,
  onSelectRolls,
  alreadyAddedRollNumbers = [],
}: RollStockPickerModalProps) {
  const [loading, setLoading] = useState(false);
  const [rolls, setRolls] = useState<AvailableLaminationRoll[]>([]);
  const [groupedByQuality, setGroupedByQuality] = useState<GroupedQualityRolls[]>([]);
  const [search, setSearch] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<string>("ALL");
  const [selectedRollIds, setSelectedRollIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      fetchAvailableRolls();
      setSelectedRollIds(new Set());
    }
  }, [open]);

  const fetchAvailableRolls = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production/lamination/available-rolls");
      const json = await res.json();
      if (json.success) {
        setRolls(json.rolls || []);
        setGroupedByQuality(json.groupedByQuality || []);
      }
    } catch (err) {
      console.error("Failed to load roll stock:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRolls = rolls.filter((r) => {
    const matchesQuality =
      selectedQuality === "ALL" || r.qualityType.toLowerCase() === selectedQuality.toLowerCase();
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      r.rollNumber.toLowerCase().includes(query) ||
      r.qualityType.toLowerCase().includes(query) ||
      String(r.loomNumber).includes(query);

    return matchesQuality && matchesSearch;
  });

  const toggleSelectRoll = (roll: AvailableLaminationRoll) => {
    const next = new Set(selectedRollIds);
    if (next.has(roll.id)) {
      next.delete(roll.id);
    } else {
      next.add(roll.id);
    }
    setSelectedRollIds(next);
  };

  const handleAddQualityGroup = (group: GroupedQualityRolls) => {
    // Exclude rolls that are already added
    const toAdd = group.rolls.filter((r) => !alreadyAddedRollNumbers.includes(r.rollNumber));
    if (toAdd.length > 0) {
      onSelectRolls(toAdd);
      onOpenChange(false);
    }
  };

  const handleConfirmSelected = () => {
    const selected = rolls.filter((r) => selectedRollIds.has(r.id));
    if (selected.length > 0) {
      onSelectRolls(selected);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 font-sans">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Import Rolls from Circular Loom Stock
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Select a quality to automatically insert all rolls serially, or select individual rolls below.
                </DialogDescription>
              </div>
            </div>
            {rolls.length > 0 && (
              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                {rolls.length} Rolls Available
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Quality Quick-Import Banners */}
        <div className="py-2">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Auto-Import Serially by Quality
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-32 overflow-y-auto pr-1">
            {groupedByQuality.map((grp) => {
              const availableInGroup = grp.rolls.filter(
                (r) => !alreadyAddedRollNumbers.includes(r.rollNumber)
              );
              return (
                <div
                  key={grp.quality}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/50 transition-all text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="font-bold text-slate-800 truncate">{grp.quality}</div>
                    <div className="text-slate-500 text-[11px]">
                      {availableInGroup.length} rolls • {grp.totalMeters.toLocaleString()} m
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-sky-300 text-sky-700 hover:bg-sky-600 hover:text-white shrink-0"
                    disabled={availableInGroup.length === 0}
                    onClick={() => handleAddQualityGroup(grp)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Insert All
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters and Individual Rolls Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 pb-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by Roll No, Loom #, or Quality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Button
              size="sm"
              variant={selectedQuality === "ALL" ? "default" : "outline"}
              className={`h-9 text-xs shrink-0 ${
                selectedQuality === "ALL" ? "bg-sky-600 hover:bg-sky-700 text-white" : ""
              }`}
              onClick={() => setSelectedQuality("ALL")}
            >
              All Qualities
            </Button>
            {groupedByQuality.slice(0, 3).map((g) => (
              <Button
                key={g.quality}
                size="sm"
                variant={selectedQuality === g.quality ? "default" : "outline"}
                className={`h-9 text-xs truncate max-w-[130px] shrink-0 ${
                  selectedQuality === g.quality ? "bg-sky-600 hover:bg-sky-700 text-white" : ""
                }`}
                onClick={() => setSelectedQuality(g.quality)}
              >
                {g.quality}
              </Button>
            ))}
          </div>
        </div>

        {/* Rolls Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
              <span className="text-xs">Loading roll inventory...</span>
            </div>
          ) : filteredRolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Package className="h-8 w-8 text-slate-300" />
              <span className="text-xs">No matching rolls found in roll stock</span>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-semibold z-10 border-b">
                <tr>
                  <th className="p-2 text-center w-10">Select</th>
                  <th className="p-2">Roll No.</th>
                  <th className="p-2">Quality</th>
                  <th className="p-2 text-center">Width</th>
                  <th className="p-2 text-center">Loom #</th>
                  <th className="p-2 text-right">Meters</th>
                  <th className="p-2 text-right">Net Wt. (Kg)</th>
                  <th className="p-2 text-right">Avg Wt. (g/m)</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRolls.map((roll) => {
                  const isAdded = alreadyAddedRollNumbers.includes(roll.rollNumber);
                  const isChecked = selectedRollIds.has(roll.id);

                  return (
                    <tr
                      key={roll.id}
                      onClick={() => !isAdded && toggleSelectRoll(roll)}
                      className={`transition-colors ${
                        isAdded
                          ? "bg-slate-50 opacity-60 cursor-not-allowed"
                          : isChecked
                          ? "bg-sky-50/80 cursor-pointer"
                          : "hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          disabled={isAdded}
                          checked={isChecked}
                          onChange={() => toggleSelectRoll(roll)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 font-mono font-semibold text-slate-900">
                        {roll.rollNumber}
                      </td>
                      <td className="p-2 font-medium text-slate-800">{roll.qualityType}</td>
                      <td className="p-2 text-center text-slate-600">{roll.size}</td>
                      <td className="p-2 text-center font-bold text-slate-700">{roll.loomNumber}</td>
                      <td className="p-2 text-right font-medium text-slate-900">
                        {roll.meter.toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-medium text-slate-900">
                        {roll.nettWeightKg.toFixed(1)}
                      </td>
                      <td className="p-2 text-right text-slate-700">
                        {roll.avgWeightPerMeter.toFixed(1)}
                      </td>
                      <td className="p-2 text-center">
                        {isAdded ? (
                          <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">
                            Added
                          </Badge>
                        ) : isChecked ? (
                          <Badge className="text-[10px] bg-sky-600 text-white">Selected</Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400">Ready</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-slate-500">
            {selectedRollIds.size} roll(s) selected
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedRollIds.size === 0}
              onClick={handleConfirmSelected}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-9 px-4"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Add Selected ({selectedRollIds.size}) Rolls
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
