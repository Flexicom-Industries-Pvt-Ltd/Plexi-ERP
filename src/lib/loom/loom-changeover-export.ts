import * as XLSX from "xlsx";

export interface LoomChangeoverItem {
  id: string;
  loomNumber: number;
  currentQuality: string;
  currentColor: string;
  currentColorGroup: string;
  currentDenier: number | null;
  currentReedSpace: number | null;
  currentBobbinMark: string;
  currentMesh: string;

  nextQualityCode: string | null;
  nextColor: string | null;
  nextColorGroup: string | null;
  nextDenier: number | null;
  nextReedSpace: number | null;
  nextBobbinMark: string | null;
  nextMesh: string | null;

  sequence: number;
  status: "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  targetDate: string | null;
  targetShiftId: string | null;
  targetShiftName: string | null;
  remarks: string | null;
  hasChangeover: boolean;
  isReedSpaceChanged: boolean;
  isColorChanged: boolean;
  isBobbinMarkChanged: boolean;
  updatedAt?: string | null;
}

export interface LoomChangeoverDataset {
  looms: LoomChangeoverItem[];
  allLooms: LoomChangeoverItem[];
  changeoverQueue: LoomChangeoverItem[];
  kpis: {
    totalLooms: number;
    totalScheduled: number;
    totalInProgress: number;
    totalCompleted: number;
    totalPending: number;
    totalReedSpaceChanges: number;
    queueLength: number;
  };
  selectedStatus?: string;
  searchQuery?: string;
}

export function exportLoomChangeoverExcel(data: LoomChangeoverDataset): void {
  const wb = XLSX.utils.book_new();
  const genTimestamp = new Date().toLocaleString();
  const emptyRow: any[] = [];

  // -------------------------------------------------------------
  // Sheet 1: Changeover Priority Execution Queue
  // -------------------------------------------------------------
  const queueHeader = [
    "Seq #",
    "Loom #",
    "Changeover Status",
    "Current Running Quality",
    "Current Color",
    "Current Denier",
    "Current Reed (cm)",
    "Current Bobbin Mark",
    "Target / Next Quality",
    "Next Color",
    "Next Denier",
    "Next Reed (cm)",
    "Next Bobbin Mark",
    "Reed Size Change?",
    "Target Date",
    "Target Shift",
    "Loom Floor Remarks & Notes",
  ];

  const queueItems = data.changeoverQueue.length > 0 ? data.changeoverQueue : data.allLooms.filter((l) => l.hasChangeover || l.sequence > 0);

  const queueRows = queueItems.map((item, idx) => [
    item.sequence > 0 ? item.sequence : idx + 1,
    `Loom #${item.loomNumber}`,
    item.status,
    item.currentQuality,
    item.currentColor,
    item.currentDenier ?? "—",
    item.currentReedSpace ? `${item.currentReedSpace} cm` : "—",
    item.currentBobbinMark,
    item.nextQualityCode || "—",
    item.nextColor || "—",
    item.nextDenier ?? "—",
    item.nextReedSpace ? `${item.nextReedSpace} cm` : "—",
    item.nextBobbinMark || "—",
    item.isReedSpaceChanged ? `YES (${item.currentReedSpace}cm -> ${item.nextReedSpace}cm)` : "NO",
    item.targetDate || "—",
    item.targetShiftName || "—",
    item.remarks || "—",
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet([
    ["FLEXICOM INDUSTRIES PVT. LTD. - CIRCULAR LOOMS CHANGEOVER EXECUTION QUEUE"],
    [`Generated: ${genTimestamp}`, `Total Queued Changeovers: ${queueItems.length}`, `Reed Space Modifications: ${data.kpis.totalReedSpaceChanges}`],
    emptyRow,
    queueHeader,
    ...queueRows,
  ]);

  ws1["!cols"] = [
    { wch: 8 },  // Seq #
    { wch: 12 }, // Loom #
    { wch: 18 }, // Status
    { wch: 30 }, // Current Quality
    { wch: 15 }, // Current Color
    { wch: 14 }, // Current Denier
    { wch: 16 }, // Current Reed
    { wch: 18 }, // Current Bobbin Mark
    { wch: 30 }, // Next Quality
    { wch: 15 }, // Next Color
    { wch: 14 }, // Next Denier
    { wch: 16 }, // Next Reed
    { wch: 18 }, // Next Bobbin Mark
    { wch: 25 }, // Reed Change
    { wch: 14 }, // Target Date
    { wch: 15 }, // Target Shift
    { wch: 35 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Changeover Queue");

  // -------------------------------------------------------------
  // Sheet 2: Factory 1-91 All Looms Master Status
  // -------------------------------------------------------------
  const allLoomsHeader = [
    "Loom #",
    "Current Running Quality",
    "Current Color Group",
    "Current Colour",
    "Current Denier",
    "Current Reed Space (cm)",
    "Current Bobbin Mark",
    "Current Mesh",
    "Target / Next Quality",
    "Next Colour",
    "Next Reed Space (cm)",
    "Next Bobbin Mark",
    "Changeover Status",
    "Sequence Order",
    "Target Date",
    "Target Shift",
    "Remarks",
  ];

  const allLoomsRows = data.allLooms.map((item) => [
    `Loom #${item.loomNumber}`,
    item.currentQuality,
    item.currentColorGroup,
    item.currentColor,
    item.currentDenier ?? "—",
    item.currentReedSpace ? `${item.currentReedSpace} cm` : "—",
    item.currentBobbinMark,
    item.currentMesh,
    item.nextQualityCode || "—",
    item.nextColor || "—",
    item.nextReedSpace ? `${item.nextReedSpace} cm` : "—",
    item.nextBobbinMark || "—",
    item.status,
    item.sequence > 0 ? item.sequence : "—",
    item.targetDate || "—",
    item.targetShiftName || "—",
    item.remarks || "—",
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([
    ["FLEXICOM INDUSTRIES - FACTORY FLOOR 1-91 CIRCULAR LOOMS CHANGEOVER MASTER SHEET"],
    [`Generated: ${genTimestamp}`, `Total Factory Looms: ${data.kpis.totalLooms}`, `Active Changeovers: ${data.kpis.totalScheduled + data.kpis.totalInProgress}`],
    emptyRow,
    allLoomsHeader,
    ...allLoomsRows,
  ]);

  ws2["!cols"] = [
    { wch: 12 }, // Loom #
    { wch: 28 }, // Current Quality
    { wch: 16 }, // Current Color Group
    { wch: 14 }, // Current Colour
    { wch: 14 }, // Current Denier
    { wch: 22 }, // Current Reed
    { wch: 18 }, // Current Bobbin
    { wch: 12 }, // Current Mesh
    { wch: 28 }, // Next Quality
    { wch: 14 }, // Next Colour
    { wch: 20 }, // Next Reed
    { wch: 18 }, // Next Bobbin
    { wch: 16 }, // Status
    { wch: 14 }, // Sequence
    { wch: 14 }, // Target Date
    { wch: 15 }, // Target Shift
    { wch: 30 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws2, "1-91 All Looms");

  // -------------------------------------------------------------
  // Sheet 3: Mechanical & Reed Space Adjustments
  // -------------------------------------------------------------
  const reedSpaceChanges = data.allLooms.filter((l) => l.isReedSpaceChanged && l.hasChangeover);
  const reedHeader = [
    "Loom #",
    "Current Reed Space (cm)",
    "Target Next Reed Space (cm)",
    "Reed Size Difference (cm)",
    "Current Quality",
    "Target Next Quality",
    "Target Shift",
    "Scheduled Date",
    "Status",
    "Mechanical Technician Notes",
  ];

  const reedRows = reedSpaceChanges.map((item) => {
    const diff = (item.nextReedSpace ?? 0) - (item.currentReedSpace ?? 0);
    return [
      `Loom #${item.loomNumber}`,
      item.currentReedSpace ? `${item.currentReedSpace} cm` : "—",
      item.nextReedSpace ? `${item.nextReedSpace} cm` : "—",
      `${diff > 0 ? `+${diff}` : `${diff}`} cm`,
      item.currentQuality,
      item.nextQualityCode || "—",
      item.targetShiftName || "—",
      item.targetDate || "—",
      item.status,
      item.remarks || "Requires mechanical reed space adjustment",
    ];
  });

  const ws3 = XLSX.utils.aoa_to_sheet([
    ["FLEXICOM INDUSTRIES - MECHANICAL & REED SPACE CHANGEOVER SCHEDULE"],
    [`Generated: ${genTimestamp}`, `Total Mechanical Reed Adjustments Required: ${reedSpaceChanges.length}`],
    emptyRow,
    reedHeader,
    ...reedRows,
  ]);

  ws3["!cols"] = [
    { wch: 12 }, // Loom #
    { wch: 22 }, // Current Reed
    { wch: 25 }, // Target Reed
    { wch: 22 }, // Diff
    { wch: 28 }, // Current Quality
    { wch: 28 }, // Next Quality
    { wch: 15 }, // Shift
    { wch: 14 }, // Date
    { wch: 16 }, // Status
    { wch: 40 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws3, "Mechanical Reed Diff");

  // -------------------------------------------------------------
  // Sheet 4: Changeover KPIs & Statistics
  // -------------------------------------------------------------
  const ws4 = XLSX.utils.aoa_to_sheet([
    ["FLEXICOM INDUSTRIES - LOOM CHANGEOVER EXECUTIVE SUMMARY & KPIS"],
    [`Generated at: ${genTimestamp}`],
    emptyRow,
    ["METRIC / KPI", "VALUE", "REMARKS"],
    ["Total Circular Looms in Factory", data.kpis.totalLooms, "Loom #1 to #91 installed capacity"],
    ["Scheduled Changeovers", data.kpis.totalScheduled, "Looms in sequence queue awaiting changeover"],
    ["In-Progress Changeovers", data.kpis.totalInProgress, "Currently under conversion on factory floor"],
    ["Completed Changeovers", data.kpis.totalCompleted, "Successfully converted to new quality formulation"],
    ["Steady Running Looms (Pending)", data.kpis.totalPending, "Looms continuing on current running quality"],
    ["Mechanical Reed Space Modifications", data.kpis.totalReedSpaceChanges, "Looms requiring physical reed dimension changes"],
  ]);

  ws4["!cols"] = [{ wch: 35 }, { wch: 15 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, ws4, "KPI Summary");

  // Write and trigger download
  const cleanDate = new Date().toISOString().slice(0, 10);
  const fileName = `Flexicom_Loom_Changeover_Sheet_${cleanDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
