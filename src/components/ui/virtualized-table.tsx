"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface VirtualizedColumn<T> {
  key: string;
  header: string;
  width?: string | number;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualizedColumn<T>[];
  rowHeight?: number;
  height?: number | string;
  className?: string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  keyExtractor?: (item: T, index: number) => string;
}

export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 48,
  height = 500,
  className = "",
  onRowClick,
  emptyMessage = "No records found.",
  keyExtractor = (_, index) => `row-${index}`,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center border border-border/50 rounded-xl bg-card/40 text-muted-foreground p-12 text-sm ${className}`}
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={`border border-border/50 rounded-xl overflow-hidden bg-card/40 flex flex-col shadow-sm ${className}`}
      style={{ height }}
    >
      {/* Sticky Table Header */}
      <div className="flex bg-muted/40 border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none shrink-0 px-4 py-3">
        {columns.map((col) => (
          <div
            key={col.key}
            style={{ width: col.width || "auto", flex: col.width ? undefined : 1 }}
            className={`truncate px-2 ${col.className || ""}`}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtualized Scrollable Body */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            const rowKey = keyExtractor(item, virtualRow.index);

            return (
              <div
                key={rowKey}
                onClick={() => onRowClick?.(item)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`flex items-center px-4 border-b border-border/30 text-sm transition-colors hover:bg-muted/30 ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    style={{ width: col.width || "auto", flex: col.width ? undefined : 1 }}
                    className={`truncate px-2 ${col.className || ""}`}
                  >
                    {col.render
                      ? col.render(item, virtualRow.index)
                      : (item as Record<string, any>)[col.key] !== undefined
                      ? String((item as Record<string, any>)[col.key])
                      : "-"}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
