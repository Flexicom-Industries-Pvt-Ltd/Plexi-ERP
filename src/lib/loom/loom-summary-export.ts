import * as XLSX from "xlsx";
import { RecipeLoomSummaryItem, LoomMachineSummaryItem } from "@/app/api/production/loom/summary/route";

export interface LoomQualityShiftEntry {
  shiftId: string;
  shiftName: string;
  date: string;
  operatorName: string | null;
  plannedKg: number;
  producedKg: number;
  wasteKg: number;
}

export interface LoomQualityItem {
  id: string;
  qualityCode: string;
  colorGroup: string;
  colour: string;
  denier: number | null;
  tapeWidth: number | null;
  bobbinMarking: string;
  reedSpaceCm: number | null;
  mesh: string;
  targetPpm: number | null;
  remarks: string | null;
  loomNumbers: number[];
  totalLooms: number;
  status: "RUNNING" | "PLANNED" | "STANDBY";
  lastRunDate?: string | null;
  latestOperator?: string | null;
  activeShifts?: string[];
  shiftBreakdown?: LoomQualityShiftEntry[];
  plannedOutputKg?: number;
  actualOutputKg?: number;
}

export interface LoomMatrixNode {
  loomNumber: number;
  isAllocated: boolean;
  qualityId: string | null;
  qualityCode: string | null;
  colorGroup: string;
  colour: string;
  denier: number | null;
  tapeWidth: number | null;
  reedSpaceCm: number | null;
  bobbinMarking: string;
  status: "RUNNING" | "PLANNED" | "STANDBY" | "UNALLOCATED";
  latestOperator?: string | null;
  activeShifts?: string[];
}

export interface LoomShiftSummaryItem {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  qualitiesCount: number;
  activeLoomsCount: number;
  producedKg: number;
  plannedKg: number;
  operators: string[];
  qualityCodes: string[];
}

export interface LoomSummaryDataset {
  selectedDate?: string;
  selectedShiftId?: string;
  selectedShiftName?: string;
  availableDates?: string[];
  availableShifts?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  }[];
  shiftSummaryList?: LoomShiftSummaryItem[];
  recipeSummaries?: RecipeLoomSummaryItem[];
  loomSummaries?: LoomMachineSummaryItem[];
  qualities: LoomQualityItem[];
  allQualities?: LoomQualityItem[];
  loomMatrix: LoomMatrixNode[];
  kpis: {
    totalLooms?: number;
    activeLoomsCount?: number;
    idleLoomsCount?: number;
    uniqueRecipesCount?: number;
    totalCratesDispatched?: number;
    totalBobbinsDispatched?: number;
    totalWeightDispatchedKg?: number;
    totalIssueSlipsCount?: number;
    totalFactoryLooms: number;
    totalAllocatedLooms: number;
    totalRunningLooms: number;
    totalPlannedLooms: number;
    totalStandbyLooms: number;
    totalUnallocatedLooms: number;
    runningQualitiesCount: number;
    plannedQualitiesCount: number;
    totalQualitiesCount: number;
    totalTapePlannedKg: number;
    totalTapeProducedKg: number;
  };
  colorGroupsSummary?: {
    colorGroup: string;
    totalLooms: number;
    qualityCount: number;
    activeLooms: number;
  }[];
}

export function exportLoomSummaryExcel(data: LoomSummaryDataset): void {
  const wb = XLSX.utils.book_new();
  const genTimestamp = new Date().toLocaleString();
  const emptyRow: any[] = [];

  const dateLabel = data.selectedDate && data.selectedDate !== "ALL" ? data.selectedDate : "All Dates (Till Date)";
  const shiftLabel = data.selectedShiftName || (data.selectedShiftId && data.selectedShiftId !== "ALL" ? data.selectedShiftId : "All Shifts");

  // -------------------------------------------------------------
  // Sheet 1: Recipe-Wise Loom Allocations
  // -------------------------------------------------------------
  const recipeHeader = [
    "#",
    "Recipe Quality Code",
    "Assigned Looms Count",
    "Assigned Loom Numbers",
    "Total Crates Issued",
    "Total Bobbins (@ 8)",
    "Total Weight Dispatched (KG)",
    "Latest Issue Date",
    "Active Shifts",
    "Issues Count",
    "Issuers (Tape Plant)",
    "Receivers (Loom)",
  ];

  const recipes = data.recipeSummaries && data.recipeSummaries.length > 0
    ? data.recipeSummaries
    : data.qualities.map((q) => ({
        recipeQuality: q.qualityCode,
        totalLoomsCount: q.totalLooms,
        assignedLooms: q.loomNumbers,
        assignedLoomIdentifiers: q.loomNumbers.map((n) => `Loom #${n}`),
        totalCratesIssued: Number(((q.actualOutputKg || 0) / 12.8).toFixed(2)),
        totalBobbinsIssued: Number(((q.actualOutputKg || 0) / 1.6).toFixed(2)),
        totalWeightIssuedKg: q.actualOutputKg || 0,
        latestIssueDate: q.lastRunDate || "—",
        activeShifts: q.activeShifts || [],
        issuesCount: 1,
        issuers: q.latestOperator ? [q.latestOperator] : [],
        receivers: [],
        recentIssues: [],
      }));

  const recipeRows = recipes.map((r, idx) => [
    idx + 1,
    r.recipeQuality,
    r.totalLoomsCount,
    r.assignedLooms.map((n) => `#${n}`).join(", ") || (r.assignedLoomIdentifiers ? r.assignedLoomIdentifiers.join(", ") : "—"),
    r.totalCratesIssued,
    r.totalBobbinsIssued,
    r.totalWeightIssuedKg,
    r.latestIssueDate,
    (r.activeShifts || []).join(", ") || "—",
    r.issuesCount,
    (r.issuers || []).join(", ") || "—",
    (r.receivers || []).join(", ") || "—",
  ]);

  const recipeSheetData = [
    ["FLEXICOM INDUSTRIES PVT. LTD. — LOOM SECTION SUMMARY"],
    ["RECIPE-WISE ALLOCATION SCHEDULE & BOBBIN DISPATCH REPORT"],
    [`Date Context: ${dateLabel}`, `Shift Context: ${shiftLabel}`, `Generated: ${genTimestamp}`],
    emptyRow,
    recipeHeader,
    ...recipeRows,
    emptyRow,
    [
      "TOTALS:",
      `${recipes.length} Qualities`,
      data.kpis.activeLoomsCount ?? data.kpis.totalRunningLooms,
      "—",
      data.kpis.totalCratesDispatched ?? 0,
      data.kpis.totalBobbinsDispatched ?? 0,
      data.kpis.totalWeightDispatchedKg ?? data.kpis.totalTapeProducedKg,
      "—",
      "—",
      data.kpis.totalIssueSlipsCount ?? 0,
    ],
  ];

  const wsRecipes = XLSX.utils.aoa_to_sheet(recipeSheetData);
  XLSX.utils.book_append_sheet(wb, wsRecipes, "Recipe Allocations");

  // -------------------------------------------------------------
  // Sheet 2: Loom-Wise Machine Matrix (Looms 1 to 91)
  // -------------------------------------------------------------
  const loomHeader = [
    "Loom #",
    "Machine ID",
    "Status",
    "Active Running Recipe",
    "Total Crates Dispatched",
    "Total Bobbins (@ 8)",
    "Total Weight (KG)",
    "Latest Issue Date",
    "Latest Shift",
    "Last Issued By",
    "Last Received By",
  ];

  const looms = data.loomSummaries && data.loomSummaries.length > 0
    ? data.loomSummaries
    : data.loomMatrix.map((m) => ({
        loomNumber: m.loomNumber,
        loomIdentifier: `Loom #${m.loomNumber}`,
        isActive: m.isAllocated,
        activeRecipe: m.qualityCode,
        allRecipes: m.qualityCode ? [m.qualityCode] : [],
        totalCrates: 0,
        totalBobbins: 0,
        totalWeightKg: 0,
        latestDate: null,
        latestShiftName: m.activeShifts?.[0] || null,
        lastIssuedBy: m.latestOperator || null,
        lastReceivedBy: null,
        allocationsCount: m.isAllocated ? 1 : 0,
        recentIssues: [],
      }));

  const loomRows = looms.map((l) => [
    l.loomNumber,
    l.loomIdentifier,
    l.isActive ? "ACTIVE / RUNNING" : "IDLE / UNASSIGNED",
    l.activeRecipe || "—",
    l.totalCrates || 0,
    l.totalBobbins || 0,
    l.totalWeightKg || 0,
    l.latestDate || "—",
    l.latestShiftName || "—",
    l.lastIssuedBy || "—",
    l.lastReceivedBy || "—",
  ]);

  const loomSheetData = [
    ["FLEXICOM INDUSTRIES PVT. LTD. — LOOM MACHINE RUN REPORT"],
    ["LOOMS 1 TO 91 STATUS & ACTIVE RECIPE MATRIX"],
    [`Date Context: ${dateLabel}`, `Shift Context: ${shiftLabel}`, `Generated: ${genTimestamp}`],
    emptyRow,
    loomHeader,
    ...loomRows,
  ];

  const wsLooms = XLSX.utils.aoa_to_sheet(loomSheetData);
  XLSX.utils.book_append_sheet(wb, wsLooms, "Looms 1-91 Matrix");

  // Trigger Excel File Download
  const filenameDate = (data.selectedDate && data.selectedDate !== "ALL" ? data.selectedDate : new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  XLSX.writeFile(wb, `Loom_Summary_Allocations_${filenameDate}.xlsx`);
}
