"use client";

import React, { useRef, useState, useCallback } from "react";
import { Plus, Trash2, Copy, Eraser } from "lucide-react";

export type ColumnDef<T> = {
  key: string;
  label: string;
  group?: string;
  groupColor?: string;
  width?: string;
  type?: "text" | "number" | "select" | "readonly";
  options?: string[];
  placeholder?: string;
  calculate?: (row: T, rowIndex: number, allRows: T[]) => any;
  align?: "left" | "center" | "right";
  minWidth?: number;
  sticky?: boolean;
};

interface SpreadsheetTableProps<T extends Record<string, any>> {
  columns: ColumnDef<T>[];
  data: T[];
  onChange: (newData: T[]) => void;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
  onCopyPrevious?: (index: number) => void;
  allowAddRow?: boolean;
  allowDeleteRow?: boolean;
  allowCopyRow?: boolean;
  allowClearRow?: boolean;
  emptyMessage?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function SpreadsheetTable<T extends Record<string, any>>({
  columns,
  data,
  onChange,
  onAddRow,
  onDeleteRow,
  onCopyPrevious,
  allowAddRow = true,
  allowDeleteRow = true,
  allowCopyRow = false,
  allowClearRow = true,
  emptyMessage = "No rows added yet. Click '+ Add Row' to start data entry.",
  title,
  subtitle,
  actions,
}: SpreadsheetTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  const handleCellChange = useCallback(
    (rowIndex: number, columnKey: string, value: any) => {
      const updated = [...data];
      const row: Record<string, any> = { ...updated[rowIndex], [columnKey]: value };

      // Recompute any calculated columns for this row
      columns.forEach((col) => {
        if (col.calculate) {
          row[col.key] = col.calculate(row as T, rowIndex, updated);
        }
      });

      updated[rowIndex] = row as T;
      onChange(updated);
    },
    [data, columns, onChange]
  );

  const focusCell = (row: number, col: number) => {
    setActiveCell({ row, col });
    const cellId = `cell-${row}-${col}`;
    const element = document.getElementById(cellId);
    if (element) {
      element.focus();
      if (element instanceof HTMLInputElement) {
        element.select();
      }
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
      const totalRows = data.length;
      const totalCols = columns.length;

      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          if (colIndex > 0) {
            focusCell(rowIndex, colIndex - 1);
          } else if (rowIndex > 0) {
            focusCell(rowIndex - 1, totalCols - 1);
          }
        } else {
          if (colIndex < totalCols - 1) {
            focusCell(rowIndex, colIndex + 1);
          } else if (rowIndex < totalRows - 1) {
            focusCell(rowIndex + 1, 0);
          } else if (allowAddRow && onAddRow) {
            onAddRow();
            setTimeout(() => focusCell(totalRows, 0), 50);
          }
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (rowIndex < totalRows - 1) {
          focusCell(rowIndex + 1, colIndex);
        } else if (allowAddRow && onAddRow) {
          onAddRow();
          setTimeout(() => focusCell(totalRows, colIndex), 50);
        }
      } else if (e.key === "ArrowUp") {
        if (rowIndex > 0) {
          e.preventDefault();
          focusCell(rowIndex - 1, colIndex);
        }
      } else if (e.key === "ArrowDown") {
        if (rowIndex < totalRows - 1) {
          e.preventDefault();
          focusCell(rowIndex + 1, colIndex);
        }
      }
    },
    [data.length, columns.length, allowAddRow, onAddRow]
  );

  const handleClearRow = (index: number) => {
    const updated = [...data];
    const cleared: Record<string, any> = {};
    columns.forEach((col) => {
      cleared[col.key] = col.key === "time" ? updated[index].time : "";
    });
    updated[index] = cleared as T;
    onChange(updated);
  };

  // Group calculations for multi-tiered super header
  const hasGroups = columns.some((col) => Boolean(col.group));
  const headerGroups: { label?: string; span: number; className?: string; cols: ColumnDef<T>[] }[] = [];

  if (hasGroups) {
    let currentGroup: string | undefined = undefined;
    let currentSpan = 0;
    let currentClass = "";
    let currentCols: ColumnDef<T>[] = [];

    columns.forEach((col, idx) => {
      if (idx === 0) {
        currentGroup = col.group;
        currentSpan = 1;
        currentClass = col.groupColor || "";
        currentCols = [col];
      } else if (col.group === currentGroup) {
        currentSpan += 1;
        currentCols.push(col);
      } else {
        headerGroups.push({ label: currentGroup, span: currentSpan, className: currentClass, cols: currentCols });
        currentGroup = col.group;
        currentSpan = 1;
        currentClass = col.groupColor || "";
        currentCols = [col];
      }
    });
    if (currentSpan > 0) {
      headerGroups.push({ label: currentGroup, span: currentSpan, className: currentClass, cols: currentCols });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {(title || subtitle || actions || allowAddRow) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {allowAddRow && onAddRow && (
              <button
                type="button"
                onClick={onAddRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-sm transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto relative max-h-[620px] scrollbar-thin scrollbar-thumb-slate-300">
        <table ref={tableRef} className="w-full text-xs border-collapse text-left border-spacing-0">
          <thead className="bg-slate-100/90 sticky top-0 z-20 backdrop-blur-sm border-b border-slate-200 shadow-sm">
            {hasGroups ? (
              <>
                {/* Top Tier Header (Zone Groups) */}
                <tr>
                  <th
                    rowSpan={2}
                    className="w-10 px-2 py-2 text-center text-slate-400 font-bold text-[10px] border-r border-b border-slate-300 bg-slate-100"
                  >
                    #
                  </th>

                  {headerGroups.map((grp, gIdx) => {
                    if (grp.label) {
                      return (
                        <th
                          key={`grp-${gIdx}`}
                          colSpan={grp.span}
                          className={`px-3 py-1.5 text-center font-black text-[11px] uppercase tracking-wider border-r border-b border-slate-300 ${
                            grp.className || "bg-slate-200/90 text-slate-800"
                          }`}
                        >
                          {grp.label}
                        </th>
                      );
                    }

                    // Standalone ungrouped column spanning both header rows
                    return grp.cols.map((col, cIdx) => {
                      const isFirstCol = gIdx === 0 && cIdx === 0;
                      return (
                        <th
                          key={col.key}
                          rowSpan={2}
                          style={{ minWidth: col.minWidth ? `${col.minWidth}px` : undefined }}
                          className={`px-3 py-2 text-slate-700 font-bold text-xs uppercase tracking-wider border-r border-b border-slate-300 whitespace-nowrap ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                          } ${isFirstCol && col.sticky ? "sticky left-0 z-30 bg-slate-100 shadow-r" : ""}`}
                        >
                          {col.label}
                        </th>
                      );
                    });
                  })}

                  {(allowDeleteRow || allowCopyRow || allowClearRow) && (
                    <th
                      rowSpan={2}
                      className="w-20 px-2 py-2 text-center text-slate-500 font-bold text-[10px] bg-slate-100 border-b border-slate-300"
                    >
                      Actions
                    </th>
                  )}
                </tr>

                {/* Sub Tier Header (Individual Column labels for grouped columns) */}
                <tr>
                  {columns
                    .filter((col) => Boolean(col.group))
                    .map((col) => (
                      <th
                        key={col.key}
                        style={{ minWidth: col.minWidth ? `${col.minWidth}px` : undefined }}
                        className={`px-2.5 py-1.5 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-r border-b border-slate-300 whitespace-nowrap bg-slate-100/90 ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                </tr>
              </>
            ) : (
              /* Single Tier Header (Standard) */
              <tr>
                <th className="w-10 px-2 py-2.5 text-center text-slate-400 font-bold text-[10px] border-r border-slate-200 bg-slate-100">
                  #
                </th>
                {columns.map((col, cIdx) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.minWidth ? `${col.minWidth}px` : undefined }}
                    className={`px-3 py-2.5 text-slate-700 font-bold text-xs uppercase tracking-wider border-r border-slate-200 whitespace-nowrap ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    } ${cIdx === 0 && col.sticky ? "sticky left-0 z-30 bg-slate-100 shadow-r" : ""}`}
                  >
                    {col.label}
                  </th>
                ))}
                {(allowDeleteRow || allowCopyRow || allowClearRow) && (
                  <th className="w-20 px-2 py-2.5 text-center text-slate-500 font-bold text-[10px] bg-slate-100">
                    Actions
                  </th>
                )}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-6 py-12 text-center text-slate-400 text-xs italic bg-slate-50/50"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-2 py-1.5 text-center font-semibold text-slate-400 border-r border-slate-200 bg-slate-50/50 text-[11px]">
                    {rIdx + 1}
                  </td>
                  {columns.map((col, cIdx) => {
                    const cellId = `cell-${rIdx}-${cIdx}`;
                    const rawValue = col.calculate ? col.calculate(row, rIdx, data) : row[col.key];
                    const displayValue = rawValue !== undefined && rawValue !== null ? rawValue : "";
                    const isReadOnly = col.type === "readonly" || Boolean(col.calculate);

                    if (isReadOnly) {
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-1.5 border-r border-slate-200 font-semibold bg-slate-50/70 text-slate-800 ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                          } ${cIdx === 0 && col.sticky ? "sticky left-0 z-10 bg-slate-100 font-bold" : ""}`}
                        >
                          <span className="block truncate">{displayValue !== "" ? String(displayValue) : "—"}</span>
                        </td>
                      );
                    }

                    if (col.type === "select" && col.options) {
                      return (
                        <td
                          key={col.key}
                          className={`p-0 border-r border-slate-200 ${
                            cIdx === 0 && col.sticky ? "sticky left-0 z-10 bg-white" : ""
                          }`}
                        >
                          <select
                            id={cellId}
                            value={String(displayValue)}
                            onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                            className="w-full h-8 px-2.5 text-xs bg-transparent border-0 focus:ring-2 focus:ring-primary focus:bg-white text-slate-800 outline-none transition-all cursor-pointer"
                          >
                            <option value="">Select...</option>
                            {col.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className={`p-0 border-r border-slate-200 ${
                          cIdx === 0 && col.sticky ? "sticky left-0 z-10 bg-white" : ""
                        }`}
                      >
                        <input
                          id={cellId}
                          type={col.type === "number" ? "number" : "text"}
                          step="any"
                          value={displayValue}
                          placeholder={col.placeholder || "—"}
                          onChange={(e) =>
                            handleCellChange(
                              rIdx,
                              col.key,
                              col.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
                            )
                          }
                          onFocus={() => setActiveCell({ row: rIdx, col: cIdx })}
                          onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                          className={`w-full h-8 px-2.5 text-xs bg-transparent border-0 focus:ring-2 focus:ring-primary focus:bg-blue-50/20 text-slate-800 outline-none transition-all ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                          }`}
                        />
                      </td>
                    );
                  })}
                  {(allowDeleteRow || allowCopyRow || allowClearRow) && (
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {allowCopyRow && onCopyPrevious && (
                          <button
                            type="button"
                            title="Copy Previous Reading"
                            onClick={() => onCopyPrevious(rIdx)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                        {allowClearRow && (
                          <button
                            type="button"
                            title="Clear Row"
                            onClick={() => handleClearRow(rIdx)}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                          >
                            <Eraser className="h-3 w-3" />
                          </button>
                        )}
                        {allowDeleteRow && onDeleteRow && (
                          <button
                            type="button"
                            title="Delete Row"
                            onClick={() => onDeleteRow(rIdx)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
