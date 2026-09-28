import * as XLSX from "xlsx";
import {
  LoomWiseRow,
  SupervisorWiseRow,
  OperatorWiseRow,
  ReportKpis,
  ReportPeriod,
} from "./print-loom-production-report";

export interface ProductionReportExportOptions {
  period: ReportPeriod;
  kpis: ReportKpis;
  loomWise: LoomWiseRow[];
  supervisorWise: SupervisorWiseRow[];
  operatorWise: OperatorWiseRow[];
}

export function exportLoomProductionReportExcel(options: ProductionReportExportOptions): void {
  const { period, kpis, loomWise, supervisorWise, operatorWise } = options;
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryData = [
    ["FLEXICOM INDUSTRIES PVT. LTD. - PLEXI ERP"],
    ["LOOM PRODUCTION REPORT - EXECUTIVE SUMMARY"],
    ["Period:", `${period.startDate} to ${period.endDate}`],
    ["Shift Filter:", period.shiftName],
    ["Target Loom:", period.targetLoomNumber ? `Loom #${period.targetLoomNumber}` : "All (1-91)"],
    ["Target Supervisor:", period.targetSupervisor || "All"],
    ["Target Operator:", period.targetOperator || "All"],
    [],
    ["METRIC", "VALUE", "UNIT"],
    ["Total Rolls Cut", kpis.totalRollsCut, "Rolls"],
    ["Total Cut Meters", kpis.totalCutMeters, "Meters"],
    ["Total Meter Reading Production", kpis.totalReadingMeters, "Meters"],
    ["Total Gross Weight", kpis.totalGrossKg, "Kg"],
    ["Total Tare Weight", kpis.totalTareKg, "Kg"],
    ["Total Nett Weight", kpis.totalNettKg, "Kg"],
    ["Total Nett Weight (MT)", kpis.totalNettMT, "MT"],
    ["Average Fabric Weight", kpis.avgWeightPerMeter, "g/m"],
    ["Plant Average Efficiency", `${kpis.avgEfficiency}%`, "%"],
    ["Total Downtime Duration", `${Math.round(kpis.totalBreakdownMinutes / 60)}h ${kpis.totalBreakdownMinutes % 60}m`, "Hours/Minutes"],
    ["Active Looms", kpis.activeLoomsCount, "Looms"],
    ["Active Supervisors", kpis.activeSupervisorsCount, "Supervisors"],
    ["Active Operators", kpis.activeOperatorsCount, "Operators"],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // 2. Loom-Wise Sheet
  const loomHeader = [
    "LOOM NO.",
    "QUALITIES",
    "ROLLS CUT",
    "CUT METERS",
    "READING METERS",
    "GROSS WT (KG)",
    "TARE WT (KG)",
    "NETT WT (KG)",
    "AVG (G/M)",
    "EFFICIENCY %",
    "DOWNTIME (MINS)",
    "PRIMARY BREAKDOWN REASON",
  ];
  const loomRows = loomWise.map((r) => [
    `#${r.loomNumber}`,
    r.qualities,
    r.totalRolls,
    r.cutMeters,
    r.readingMeters,
    r.grossWeightKg,
    r.tareWeightKg,
    r.nettWeightKg,
    r.avgWeightPerMeter,
    `${r.avgEfficiency}%`,
    r.breakdownMinutes,
    r.primaryBreakdownReason,
  ]);
  const loomTotals = [
    "TOTAL",
    "—",
    kpis.totalRollsCut,
    kpis.totalCutMeters,
    kpis.totalReadingMeters,
    kpis.totalGrossKg,
    kpis.totalTareKg,
    kpis.totalNettKg,
    kpis.avgWeightPerMeter,
    `${kpis.avgEfficiency}%`,
    kpis.totalBreakdownMinutes,
    "—",
  ];
  const loomWs = XLSX.utils.aoa_to_sheet([loomHeader, ...loomRows, loomTotals]);
  XLSX.utils.book_append_sheet(wb, loomWs, "Loom-Wise");

  // 3. Supervisor-Wise Sheet
  const supHeader = [
    "S.NO",
    "SUPERVISOR NAME",
    "SHIFTS SUPERVISED",
    "DAYS ACTIVE",
    "LOOMS COVERED",
    "ROLLS CUT",
    "CUT METERS",
    "GROSS WT (KG)",
    "TARE WT (KG)",
    "NETT WT (KG)",
    "AVG (G/M)",
    "SHARE %",
  ];
  const supRows = supervisorWise.map((r, i) => [
    i + 1,
    r.supervisorName,
    r.shiftsSupervised,
    r.daysActive,
    r.loomsCoveredCount,
    r.totalRolls,
    r.cutMeters,
    r.grossWeightKg,
    r.tareWeightKg,
    r.nettWeightKg,
    r.avgWeightPerMeter,
    `${r.sharePct}%`,
  ]);
  const supTotals = [
    "",
    "TOTAL",
    "—",
    "—",
    "—",
    kpis.totalRollsCut,
    kpis.totalCutMeters,
    kpis.totalGrossKg,
    kpis.totalTareKg,
    kpis.totalNettKg,
    kpis.avgWeightPerMeter,
    "100.0%",
  ];
  const supWs = XLSX.utils.aoa_to_sheet([supHeader, ...supRows, supTotals]);
  XLSX.utils.book_append_sheet(wb, supWs, "Supervisor-Wise");

  // 4. Operator-Wise Sheet
  const opHeader = [
    "S.NO",
    "OPERATOR NAME",
    "SHIFT LOGS",
    "DAYS ACTIVE",
    "LOOMS COUNT",
    "LOOMS LIST",
    "TOTAL METERS PRODUCED",
    "AVG EFFICIENCY %",
    "DOWNTIME (MINS)",
  ];
  const opRows = operatorWise.map((r, i) => [
    i + 1,
    r.operatorName,
    r.shiftLogsCount,
    r.daysActive,
    r.loomsHandledCount,
    r.loomsList,
    r.totalProductionMeters,
    `${r.avgEfficiency}%`,
    r.breakdownMinutes,
  ]);
  const opTotals = [
    "",
    "TOTAL",
    "—",
    "—",
    "—",
    "—",
    kpis.totalReadingMeters,
    `${kpis.avgEfficiency}%`,
    kpis.totalBreakdownMinutes,
  ];
  const opWs = XLSX.utils.aoa_to_sheet([opHeader, ...opRows, opTotals]);
  XLSX.utils.book_append_sheet(wb, opWs, "Operator-Wise");

  const filename = `Loom_Production_Report_${period.startDate}_to_${period.endDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}
