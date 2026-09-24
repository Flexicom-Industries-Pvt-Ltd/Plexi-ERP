import * as XLSX from "xlsx";

export interface ReportSummaryItem {
  id: string;
  date: string;
  shiftId: string;
  shiftName: string;
  operatorName: string;
  operatorId?: string | null;
  recipeQuality: string;
  plannedKg: number;
  actualKg: number;
  gapKg: number;
  wasteKg: number;
  wastePercent: number;
  netKg: number;
  efficiencyPercent: number;
  status: string;
}

export interface ShiftWiseItem {
  shiftId: string;
  shiftName: string;
  recordCount: number;
  plannedKg: number;
  actualKg: number;
  gapKg: number;
  wasteKg: number;
  wastePercent: number;
  netKg: number;
  efficiencyPercent: number;
  productionShare: number;
  operators: string[];
}

export interface OperatorWiseItem {
  operatorName: string;
  shiftCount: number;
  plannedKg: number;
  actualKg: number;
  gapKg: number;
  wasteKg: number;
  wastePercent: number;
  netKg: number;
  efficiencyPercent: number;
  qualityScore: number;
  productionShare: number;
  shifts: string[];
}

export interface WasteItem {
  shiftName?: string;
  operatorName?: string;
  actualKg: number;
  wasteKg: number;
  wastePercent: number;
  statusBenchmark: string;
}

export interface EfficiencyItem {
  shiftName?: string;
  operatorName?: string;
  plannedKg: number;
  actualKg: number;
  efficiencyPercent: number;
  netEfficiencyPercent?: number;
  qualityScore?: number;
  performanceTier: string;
}

export interface TapePlantReportDataset {
  summary: ReportSummaryItem[];
  shiftWise: ShiftWiseItem[];
  operatorWise: OperatorWiseItem[];
  wasteShiftWise: WasteItem[];
  wasteOperatorWise: WasteItem[];
  efficiencyShiftWise: EfficiencyItem[];
  efficiencyOperatorWise: EfficiencyItem[];
  totals: {
    totalPlannedKg: number;
    totalActualKg: number;
    totalGapKg: number;
    totalWasteKg: number;
    totalNetKg: number;
    avgWastePercent: number;
    avgEfficiencyPercent: number;
    totalShiftsCount: number;
    totalOperatorsCount: number;
    recordCount: number;
  };
  distinctOperators?: string[];
  count: number;
}

export interface ExportReportOptions {
  data: TapePlantReportDataset;
  dateFrom: string;
  dateTo: string;
  mode?: "all" | "summary" | "shift" | "operator" | "waste" | "efficiency";
}

export function exportTapePlantReportsExcel({
  data,
  dateFrom,
  dateTo,
  mode = "all",
}: ExportReportOptions): void {
  const wb = XLSX.utils.book_new();
  const dateRangeLabel = `${dateFrom} to ${dateTo}`;
  const genTimestamp = new Date().toLocaleString();

  const emptyRow: any[] = [];

  // -------------------------------------------------------------
  // Sheet 1: Executive Overview & Totals
  // -------------------------------------------------------------
  if (mode === "all") {
    const execHeader = [
      ["FLEXICOM INDUSTRIES PVT. LTD. - TAPE PLANT EXECUTIVE REPORT OVERVIEW"],
      [`Reporting Period: ${dateRangeLabel}`, `Generated On: ${genTimestamp}`],
      emptyRow,
      ["PLANT PRODUCTION & PERFORMANCE SCORECARD", ""],
      ["Metric Indicator", "Consolidated Value"],
      ["Total Planned Target (KG)", data.totals.totalPlannedKg],
      ["Total Actual Output (KG)", data.totals.totalActualKg],
      ["Total Output Variance / Gap (KG)", data.totals.totalGapKg],
      ["Total Factory Waste (KG)", data.totals.totalWasteKg],
      ["Total Net Prime Output (KG)", data.totals.totalNetKg],
      ["Plant Average Waste Rate (%)", `${data.totals.avgWastePercent}%`],
      ["Plant Average Efficiency Rate (%)", `${data.totals.avgEfficiencyPercent}%`],
      ["Total Shifts Covered", data.totals.totalShiftsCount],
      ["Total Operators Active", data.totals.totalOperatorsCount],
      ["Total Production Batches / Logs", data.totals.recordCount],
    ];

    const wsExec = XLSX.utils.aoa_to_sheet(execHeader);
    wsExec["!cols"] = [{ wch: 38 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, wsExec, "Executive Overview");
  }

  // -------------------------------------------------------------
  // Sheet: Granular Production Summary
  // -------------------------------------------------------------
  if (mode === "all" || mode === "summary") {
    const summaryHeader = [
      "Date",
      "Shift",
      "Operator",
      "Recipe / Quality",
      "Planned (KG)",
      "Actual (KG)",
      "Gap (KG)",
      "Waste (KG)",
      "Waste %",
      "Net Output (KG)",
      "Efficiency %",
      "Status",
    ];

    const summaryRows = data.summary.map((r) => [
      r.date,
      r.shiftName,
      r.operatorName,
      r.recipeQuality,
      r.plannedKg,
      r.actualKg,
      r.gapKg,
      r.wasteKg,
      `${r.wastePercent}%`,
      r.netKg,
      `${r.efficiencyPercent}%`,
      r.status,
    ]);

    const summaryTotalRow = [
      "TOTAL",
      "—",
      "—",
      `${data.summary.length} Records`,
      data.totals.totalPlannedKg,
      data.totals.totalActualKg,
      data.totals.totalGapKg,
      data.totals.totalWasteKg,
      `${data.totals.avgWastePercent}%`,
      data.totals.totalNetKg,
      `${data.totals.avgEfficiencyPercent}%`,
      "",
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet([
      ["FLEXICOM INDUSTRIES - TAPE PLANT GRANULAR PRODUCTION SUMMARY"],
      [`Period: ${dateRangeLabel}`, `Generated: ${genTimestamp}`],
      emptyRow,
      summaryHeader,
      ...summaryRows,
      emptyRow,
      summaryTotalRow,
    ]);

    wsSummary["!cols"] = [
      { wch: 12 }, // Date
      { wch: 22 }, // Shift
      { wch: 22 }, // Operator
      { wch: 28 }, // Recipe
      { wch: 15 }, // Planned
      { wch: 15 }, // Actual
      { wch: 12 }, // Gap
      { wch: 12 }, // Waste
      { wch: 10 }, // Waste %
      { wch: 16 }, // Net
      { wch: 14 }, // Efficiency
      { wch: 12 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, "Production Summary");
  }

  // -------------------------------------------------------------
  // Sheet: Shift-Wise Production & Performance
  // -------------------------------------------------------------
  if (mode === "all" || mode === "shift") {
    const shiftHeader = [
      "Shift Name",
      "Batches Count",
      "Planned Target (KG)",
      "Actual Output (KG)",
      "Variance Gap (KG)",
      "Waste Generated (KG)",
      "Waste Rate (%)",
      "Net Prime Output (KG)",
      "Shift Efficiency (%)",
      "Plant Share (%)",
      "Active Operators",
    ];

    const shiftRows = data.shiftWise.map((s) => [
      s.shiftName,
      s.recordCount,
      s.plannedKg,
      s.actualKg,
      s.gapKg,
      s.wasteKg,
      `${s.wastePercent}%`,
      s.netKg,
      `${s.efficiencyPercent}%`,
      `${s.productionShare}%`,
      s.operators.join(", ") || "—",
    ]);

    const wsShift = XLSX.utils.aoa_to_sheet([
      ["FLEXICOM INDUSTRIES - TAPE PLANT PRODUCTION SHIFT-WISE ANALYSIS"],
      [`Period: ${dateRangeLabel}`, `Generated: ${genTimestamp}`],
      emptyRow,
      shiftHeader,
      ...shiftRows,
      emptyRow,
      [
        "TOTAL",
        data.totals.recordCount,
        data.totals.totalPlannedKg,
        data.totals.totalActualKg,
        data.totals.totalGapKg,
        data.totals.totalWasteKg,
        `${data.totals.avgWastePercent}%`,
        data.totals.totalNetKg,
        `${data.totals.avgEfficiencyPercent}%`,
        "100.0%",
        "",
      ],
    ]);

    wsShift["!cols"] = [
      { wch: 24 }, // Shift Name
      { wch: 14 }, // Batches
      { wch: 20 }, // Planned
      { wch: 20 }, // Actual
      { wch: 16 }, // Gap
      { wch: 20 }, // Waste
      { wch: 14 }, // Waste %
      { wch: 22 }, // Net
      { wch: 20 }, // Efficiency %
      { wch: 14 }, // Share %
      { wch: 30 }, // Operators
    ];

    XLSX.utils.book_append_sheet(wb, wsShift, "Shift-Wise Analysis");
  }

  // -------------------------------------------------------------
  // Sheet: Operator-Wise Production & Performance
  // -------------------------------------------------------------
  if (mode === "all" || mode === "operator") {
    const opHeader = [
      "Operator Name",
      "Shifts / Runs",
      "Planned Target (KG)",
      "Actual Output (KG)",
      "Variance Gap (KG)",
      "Waste (KG)",
      "Waste %",
      "Net Output (KG)",
      "Efficiency (%)",
      "Quality Score",
      "Plant Share (%)",
      "Assigned Shifts",
    ];

    const opRows = data.operatorWise.map((op) => [
      op.operatorName,
      op.shiftCount,
      op.plannedKg,
      op.actualKg,
      op.gapKg,
      op.wasteKg,
      `${op.wastePercent}%`,
      op.netKg,
      `${op.efficiencyPercent}%`,
      op.qualityScore,
      `${op.productionShare}%`,
      op.shifts.join(", ") || "—",
    ]);

    const wsOp = XLSX.utils.aoa_to_sheet([
      ["FLEXICOM INDUSTRIES - TAPE PLANT PRODUCTION OPERATOR-WISE ANALYSIS"],
      [`Period: ${dateRangeLabel}`, `Generated: ${genTimestamp}`],
      emptyRow,
      opHeader,
      ...opRows,
      emptyRow,
      [
        "TOTAL",
        data.totals.recordCount,
        data.totals.totalPlannedKg,
        data.totals.totalActualKg,
        data.totals.totalGapKg,
        data.totals.totalWasteKg,
        `${data.totals.avgWastePercent}%`,
        data.totals.totalNetKg,
        `${data.totals.avgEfficiencyPercent}%`,
        "—",
        "100.0%",
        "",
      ],
    ]);

    wsOp["!cols"] = [
      { wch: 24 }, // Operator Name
      { wch: 14 }, // Shifts
      { wch: 20 }, // Planned
      { wch: 20 }, // Actual
      { wch: 16 }, // Gap
      { wch: 14 }, // Waste
      { wch: 12 }, // Waste %
      { wch: 18 }, // Net
      { wch: 16 }, // Efficiency
      { wch: 14 }, // Quality Score
      { wch: 14 }, // Share %
      { wch: 26 }, // Shifts
    ];

    XLSX.utils.book_append_sheet(wb, wsOp, "Operator-Wise Analysis");
  }

  // -------------------------------------------------------------
  // Sheet: Wastage Analysis (Shift & Operator)
  // -------------------------------------------------------------
  if (mode === "all" || mode === "waste") {
    const wasteShiftHeader = [
      "Shift Name",
      "Total Produced (KG)",
      "Waste Generated (KG)",
      "Wastage Rate (%)",
      "Benchmark Status",
    ];

    const wasteShiftRows = data.wasteShiftWise.map((w) => [
      w.shiftName || "—",
      w.actualKg,
      w.wasteKg,
      `${w.wastePercent}%`,
      w.statusBenchmark,
    ]);

    const wasteOpHeader = [
      "Operator Name",
      "Total Produced (KG)",
      "Waste Generated (KG)",
      "Wastage Rate (%)",
      "Benchmark Status",
    ];

    const wasteOpRows = data.wasteOperatorWise.map((w) => [
      w.operatorName || "—",
      w.actualKg,
      w.wasteKg,
      `${w.wastePercent}%`,
      w.statusBenchmark,
    ]);

    const wsWaste = XLSX.utils.aoa_to_sheet([
      ["FLEXICOM INDUSTRIES - TAPE PLANT WASTAGE BREAKDOWN REPORT"],
      [`Period: ${dateRangeLabel}`, `Generated: ${genTimestamp}`],
      emptyRow,
      ["1. SHIFT-WISE WASTAGE ANALYSIS"],
      wasteShiftHeader,
      ...wasteShiftRows,
      emptyRow,
      ["2. OPERATOR-WISE WASTAGE ANALYSIS"],
      wasteOpHeader,
      ...wasteOpRows,
      emptyRow,
      [
        "PLANT TOTAL WASTE",
        data.totals.totalActualKg,
        data.totals.totalWasteKg,
        `${data.totals.avgWastePercent}%`,
        data.totals.avgWastePercent <= 1.5 ? "OPTIMAL" : data.totals.avgWastePercent <= 3.0 ? "ACCEPTABLE" : "HIGH",
      ],
    ]);

    wsWaste["!cols"] = [
      { wch: 26 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, wsWaste, "Wastage Analysis");
  }

  // -------------------------------------------------------------
  // Sheet: Efficiency & Performance Analysis
  // -------------------------------------------------------------
  if (mode === "all" || mode === "efficiency") {
    const effShiftHeader = [
      "Shift Name",
      "Planned Target (KG)",
      "Actual Delivered (KG)",
      "Efficiency Rate (%)",
      "Net Output Efficiency (%)",
      "Performance Tier",
    ];

    const effShiftRows = data.efficiencyShiftWise.map((e) => [
      e.shiftName || "—",
      e.plannedKg,
      e.actualKg,
      `${e.efficiencyPercent}%`,
      `${e.netEfficiencyPercent || 0}%`,
      e.performanceTier,
    ]);

    const effOpHeader = [
      "Operator Name",
      "Planned Target (KG)",
      "Actual Delivered (KG)",
      "Efficiency Rate (%)",
      "Quality Score",
      "Performance Tier",
    ];

    const effOpRows = data.efficiencyOperatorWise.map((e) => [
      e.operatorName || "—",
      e.plannedKg,
      e.actualKg,
      `${e.efficiencyPercent}%`,
      e.qualityScore || "—",
      e.performanceTier,
    ]);

    const wsEff = XLSX.utils.aoa_to_sheet([
      ["FLEXICOM INDUSTRIES - TAPE PLANT EFFICIENCY & PERFORMANCE BENCHMARK"],
      [`Period: ${dateRangeLabel}`, `Generated: ${genTimestamp}`],
      emptyRow,
      ["1. SHIFT-WISE EFFICIENCY BENCHMARK"],
      effShiftHeader,
      ...effShiftRows,
      emptyRow,
      ["2. OPERATOR-WISE EFFICIENCY BENCHMARK"],
      effOpHeader,
      ...effOpRows,
      emptyRow,
      [
        "PLANT AVERAGE EFFICIENCY",
        data.totals.totalPlannedKg,
        data.totals.totalActualKg,
        `${data.totals.avgEfficiencyPercent}%`,
        "—",
        data.totals.avgEfficiencyPercent >= 98 ? "TOP_TIER" : data.totals.avgEfficiencyPercent >= 90 ? "ON_TARGET" : "BELOW_TARGET",
      ],
    ]);

    wsEff["!cols"] = [
      { wch: 26 },
      { wch: 22 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, wsEff, "Efficiency & Performance");
  }

  // Generate Filename & Trigger Download
  const modeSuffix = mode === "all" ? "Consolidated_Master" : mode.toUpperCase();
  const filename = `Tape_Plant_Report_${modeSuffix}_${dateFrom}_to_${dateTo}.xlsx`;
  XLSX.writeFile(wb, filename);
}
