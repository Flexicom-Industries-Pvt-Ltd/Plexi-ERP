import * as XLSX from "xlsx";
import { LoomChangeoverLogItem } from "@/app/api/production/loom/changeover/route";

export interface LoomChangeoverExportOptions {
  logs: LoomChangeoverLogItem[];
  kpis?: {
    totalLogs: number;
    totalDowntimeMinutes: number;
    totalDowntimeHours: number;
    avgDowntimeMinutes: number;
    uniqueLoomsCount: number;
    scheduledCount: number;
    factoryTotalLooms: number;
  };
  filterDate?: string;
  filterShift?: string;
  searchQuery?: string;
}

export function exportLoomChangeoverExcel(options: LoomChangeoverExportOptions): void {
  const { logs, kpis, filterDate, filterShift, searchQuery } = options;
  const wb = XLSX.utils.book_new();
  const genTimestamp = new Date().toLocaleString();
  const emptyRow: any[] = [];

  // -------------------------------------------------------------
  // Sheet 1: Quality Changeover Event Logs
  // -------------------------------------------------------------
  const logHeader = [
    "Log #",
    "Date",
    "Shift",
    "Loom #",
    "Operator",
    "From Quality (Current)",
    "To Quality (Target)",
    "Downtime (Mins)",
    "Status",
    "Source",
    "Logged By",
    "Remarks / Notes",
  ];

  const logRows = logs.map((item, idx) => [
    idx + 1,
    item.date,
    item.shiftName,
    `Loom #${item.loomNumber}`,
    item.operatorName || "—",
    item.fromQuality,
    item.toQuality,
    item.downtimeMinutes > 0 ? item.downtimeMinutes : 0,
    item.status,
    item.source === "READING_SHEET" ? "2-Hr Reading Sheet" : item.source === "SCHEDULED" ? "Master Scheduled" : "Manual",
    item.loggedBy,
    item.remarks || "—",
  ]);

  const totalDowntime = logs.reduce((sum, l) => sum + (l.downtimeMinutes || 0), 0);
  const avgDowntime = logs.length > 0 ? Math.round((totalDowntime / logs.length) * 10) / 10 : 0;

  const titleRows = [
    ["FLEXICOM INDUSTRIES PVT. LTD. - CIRCULAR LOOMS CHANGEOVER LOG REPORT"],
    ["SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143"],
    [
      `Generated: ${genTimestamp}`,
      `Filter Date: ${filterDate || "All Dates"}`,
      `Shift: ${filterShift || "All Shifts"}`,
      `Search: ${searchQuery || "None"}`,
      `Total Changeover Records: ${logs.length}`,
      `Total Downtime: ${totalDowntime} Mins (${Math.round((totalDowntime / 60) * 10) / 10} Hrs)`,
      `Avg Downtime: ${avgDowntime} Mins`,
    ],
    emptyRow,
    logHeader,
    ...logRows,
    emptyRow,
    [
      "TOTAL SUMMARY",
      "",
      "",
      "",
      "",
      "",
      "",
      totalDowntime,
      "",
      "",
      "",
      `Total Events: ${logs.length} | Avg Downtime: ${avgDowntime} mins`,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(titleRows);

  ws["!cols"] = [
    { wch: 8 },  // Log #
    { wch: 14 }, // Date
    { wch: 14 }, // Shift
    { wch: 12 }, // Loom #
    { wch: 20 }, // Operator
    { wch: 26 }, // From Quality
    { wch: 26 }, // To Quality
    { wch: 16 }, // Downtime Mins
    { wch: 16 }, // Status
    { wch: 22 }, // Source
    { wch: 20 }, // Logged By
    { wch: 35 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Changeover Logs");

  const fileName = `Loom_Changeover_Logs_${(filterDate || new Date().toISOString().slice(0, 10)).replace(/-/g, "")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
