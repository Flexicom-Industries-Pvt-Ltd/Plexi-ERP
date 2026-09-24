import * as XLSX from "xlsx";

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
}

export interface LoomSummaryDataset {
  qualities: LoomQualityItem[];
  loomMatrix: LoomMatrixNode[];
  kpis: {
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
  colorGroupsSummary: {
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

  // -------------------------------------------------------------
  // Sheet 1: Quality Formulation & Loom Allocations
  // -------------------------------------------------------------
  const qualityHeader = [
    "#",
    "Quality Formulation Code",
    "Tape Plant Status",
    "Color Group",
    "Colour",
    "Denier",
    "Tape Width (mm)",
    "Reed Space (cm)",
    "Bobbin Marking",
    "Mesh",
    "Target PPM",
    "Allocated Looms Count",
    "Assigned Loom Numbers",
    "Active Shifts",
    "Latest Operator",
  ];

  const qualityRows = data.qualities.map((q, idx) => [
    idx + 1,
    q.qualityCode,
    q.status,
    q.colorGroup,
    q.colour,
    q.denier || "—",
    q.tapeWidth || "—",
    q.reedSpaceCm || "—",
    q.bobbinMarking,
    q.mesh,
    q.targetPpm || "—",
    q.totalLooms,
    q.loomNumbers.map((n) => `#${n}`).join(", "),
    (q.activeShifts || []).join(", ") || "—",
    q.latestOperator || "—",
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([
    ["FLEXICOM INDUSTRIES PVT. LTD. - LOOM SECTION MASTER ALLOCATION & RUNNING QUALITIES"],
    [`Generated On: ${genTimestamp}`, `Total Factory Looms: ${data.kpis.totalFactoryLooms}`, `Allocated: ${data.kpis.totalAllocatedLooms}`],
    emptyRow,
    qualityHeader,
    ...qualityRows,
    emptyRow,
    [
      "TOTAL",
      `${data.qualities.length} Active Qualities`,
      `${data.kpis.runningQualitiesCount} Running`,
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      "—",
      data.kpis.totalAllocatedLooms,
      "—",
      "",
      "",
    ],
  ]);

  ws1["!cols"] = [
    { wch: 6 },  // #
    { wch: 30 }, // Quality
    { wch: 18 }, // Status
    { wch: 16 }, // Color Group
    { wch: 14 }, // Colour
    { wch: 10 }, // Denier
    { wch: 16 }, // Tape Width
    { wch: 16 }, // Reed Space
    { wch: 18 }, // Bobbin Marking
    { wch: 12 }, // Mesh
    { wch: 12 }, // Target PPM
    { wch: 22 }, // Loom Count
    { wch: 45 }, // Loom Numbers
    { wch: 22 }, // Shifts
    { wch: 20 }, // Operator
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Loom Allocations");

  // -------------------------------------------------------------
  // Sheet 2: 1-91 Factory Loom Floor Matrix
  // -------------------------------------------------------------
  const matrixHeader = [
    "Loom #",
    "Allocation Status",
    "Running Quality Code",
    "Color Group",
    "Colour",
    "Denier",
    "Tape Width (mm)",
    "Reed Space (cm)",
    "Bobbin Marking",
    "Tape Plant Status",
  ];

  const matrixRows = data.loomMatrix.map((m) => [
    `Loom #${m.loomNumber}`,
    m.isAllocated ? "ALLOCATED" : "UNALLOCATED",
    m.qualityCode || "—",
    m.colorGroup,
    m.colour,
    m.denier || "—",
    m.tapeWidth || "—",
    m.reedSpaceCm || "—",
    m.bobbinMarking,
    m.status,
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([
    ["FLEXICOM INDUSTRIES - FACTORY FLOOR 1-91 LOOM MACHINE STATUS MATRIX"],
    [`Generated: ${genTimestamp}`, `Total Looms: ${data.kpis.totalFactoryLooms}`],
    emptyRow,
    matrixHeader,
    ...matrixRows,
  ]);

  ws2["!cols"] = [
    { wch: 12 }, // Loom #
    { wch: 20 }, // Allocation
    { wch: 30 }, // Quality
    { wch: 16 }, // Color Group
    { wch: 14 }, // Colour
    { wch: 10 }, // Denier
    { wch: 16 }, // Tape Width
    { wch: 16 }, // Reed Space
    { wch: 18 }, // Bobbin
    { wch: 18 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws2, "1-91 Loom Matrix");

  // -------------------------------------------------------------
  // Sheet 3: Scorecard & Color Group Distribution
  // -------------------------------------------------------------
  const cgHeader = ["Color Group", "Assigned Looms Count", "Active Qualities", "Running Looms"];
  const cgRows = data.colorGroupsSummary.map((cg) => [
    cg.colorGroup,
    cg.totalLooms,
    cg.qualityCount,
    cg.activeLooms,
  ]);

  const ws3 = XLSX.utils.aoa_to_sheet([
    ["FLEXICOM INDUSTRIES - LOOM SECTION EXECUTIVE SCORECARD"],
    [`Generated: ${genTimestamp}`],
    emptyRow,
    ["KPI METRICS", "VALUE"],
    ["Total Factory Looms", data.kpis.totalFactoryLooms],
    ["Total Allocated Looms", data.kpis.totalAllocatedLooms],
    ["Looms On Active Running Tape", data.kpis.totalRunningLooms],
    ["Looms On Planned Tape", data.kpis.totalPlannedLooms],
    ["Looms On Standby Qualities", data.kpis.totalStandbyLooms],
    ["Unallocated / Idle Looms", data.kpis.totalUnallocatedLooms],
    ["Active Qualities In Production", data.kpis.runningQualitiesCount],
    ["Total Mapped Qualities", data.kpis.totalQualitiesCount],
    emptyRow,
    ["COLOR GROUP LOOM DISTRIBUTION", "", "", ""],
    cgHeader,
    ...cgRows,
  ]);

  ws3["!cols"] = [{ wch: 32 }, { wch: 22 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws3, "KPI Scorecard");

  const filename = `Loom_Section_Summary_Allocations_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
