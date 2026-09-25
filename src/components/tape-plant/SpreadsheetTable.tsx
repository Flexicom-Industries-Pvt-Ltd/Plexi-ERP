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

  const isColEditable = useCallback(
    (cIdx: number) => {
      const col = columns[cIdx];
      if (!col) return false;
      return col.type !== "readonly" && !col.calculate;
    },
    [columns]
  );

  const focusCell = useCallback((row: number, col: number) => {
    setActiveCell({ row, col });
    const cellId = `cell-${row}-${col}`;
    const element = document.getElementById(cellId);
    if (element) {
      element.focus();
      if (element instanceof HTMLInputElement) {
        element.select();
      }
    }
  }, []);

  const findHorizontalEditableCell = useCallback(
    (startRow: number, startCol: number, forward: boolean) => {
      let r = startRow;
      let c = startCol;
      const totalRows = data.length;
      const totalCols = columns.length;

      while (r >= 0 && r < totalRows) {
        if (forward) {
          c++;
          if (c >= totalCols) {
            c = 0;
            r++;
          }
        } else {
          c--;
          if (c < 0) {
            c = totalCols - 1;
            r--;
          }
        }
        if (r >= 0 && r < totalRows && isColEditable(c)) {
          return { row: r, col: c };
        }
      }
      return null;
    },
    [data.length, columns.length, isColEditable]
  );

  const findVerticalEditableCell = useCallback(
    (startRow: number, colIndex: number, delta: number) => {
      const targetRow = startRow + delta;
      if (targetRow >= 0 && targetRow < data.length) {
        if (isColEditable(colIndex)) {
          return { row: targetRow, col: colIndex };
        }
        // If current column isn't editable, search nearest editable column in target row
        for (let offset = 1; offset < columns.length; offset++) {
          if (colIndex + offset < columns.length && isColEditable(colIndex + offset)) {
            return { row: targetRow, col: colIndex + offset };
          }
          if (colIndex - offset >= 0 && isColEditable(colIndex - offset)) {
            return { row: targetRow, col: colIndex - offset };
          }
        }
      }
      return null;
    },
    [data.length, columns.length, isColEditable]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement;
      const isInput = target instanceof HTMLInputElement;
      const totalRows = data.length;

      if (e.key === "Tab") {
        e.preventDefault();
        const next = findHorizontalEditableCell(rowIndex, colIndex, !e.shiftKey);
        if (next) {
          focusCell(next.row, next.col);
        } else if (!e.shiftKey && allowAddRow && onAddRow) {
          onAddRow();
          setTimeout(() => {
            const firstEditable = columns.findIndex((_, idx) => isColEditable(idx));
            focusCell(totalRows, firstEditable >= 0 ? firstEditable : 0);
          }, 50);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        const next = findVerticalEditableCell(rowIndex, colIndex, 1);
        if (next) {
          focusCell(next.row, next.col);
        } else if (allowAddRow && onAddRow) {
          onAddRow();
          setTimeout(() => focusCell(totalRows, colIndex), 50);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = findVerticalEditableCell(rowIndex, colIndex, -1);
        if (next) {
          focusCell(next.row, next.col);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = findVerticalEditableCell(rowIndex, colIndex, 1);
        if (next) {
          focusCell(next.row, next.col);
        }
      } else if (e.key === "ArrowLeft") {
        const isAllSelected = isInput && target.selectionStart === 0 && target.selectionEnd === target.value.length;
        const isAtStart = isInput && target.selectionStart === 0;
        const isSelect = target instanceof HTMLSelectElement;

        if (isAllSelected || isAtStart || isSelect) {
          const next = findHorizontalEditableCell(rowIndex, colIndex, false);
          if (next) {
            e.preventDefault();
            focusCell(next.row, next.col);
          }
        }
      } else if (e.key === "ArrowRight") {
        const isAllSelected = isInput && target.selectionStart === 0 && target.selectionEnd === target.value.length;
        const isAtEnd = isInput && target.selectionEnd === target.value.length;
        const isSelect = target instanceof HTMLSelectElement;

        if (isAllSelected || isAtEnd || isSelect) {
          const next = findHorizontalEditableCell(rowIndex, colIndex, true);
          if (next) {
            e.preventDefault();
            focusCell(next.row, next.col);
          }
        }
      }
    },
    [
      data.length,
      columns,
      allowAddRow,
      onAddRow,
      isColEditable,
      findHorizontalEditableCell,
      findVerticalEditableCell,
      focusCell,
    ]
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
    <div className="w-full min-w-0 max-w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {(title || subtitle || actions || allowAddRow) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 min-w-0">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold text-slate-800 truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
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

      <div className="w-full min-w-0 overflow-x-auto relative max-h-[620px] scrollbar-thin scrollbar-thumb-slate-300">
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
