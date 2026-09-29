import * as XLSX from "xlsx";

export function exportProductionSummaryExcel(
  overall: any,
  contractorSummary: any[],
  operatorSummary: any[],
  qualitySummary: any[],
  dateRange: { from: string; to: string }
): void {
  const wb = XLSX.utils.book_new();

  // 1. Overall KPI Sheet
  const overallData: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED"],
    ["LAMINATION PRODUCTION SUMMARY REPORT"],
    [`Period: ${dateRange.from || "Start"} to ${dateRange.to || "Current"}`],
    [],
    ["METRIC", "VALUE", "UNIT"],
    ["Total Shifts", overall.totalShifts, "shifts"],
    ["Total Rolls Processed", overall.totalRolls, "rolls"],
    ["Total Production", overall.totalProductionMtrs, "meters"],
    ["Total Laminated Output", overall.totalNetWtAfter, "kg"],
    ["Total Unlaminated Fabric Consumed", overall.totalNetWtBefore, "kg"],
    ["Average Coating Weight", overall.avgCoating, "g/m"],
  ];
  const wsOverall = XLSX.utils.aoa_to_sheet(overallData);
  XLSX.utils.book_append_sheet(wb, wsOverall, "Overall Summary");

  // 2. Contractor-wise Sheet
  const contractorData: any[][] = [
    ["CONTRACTOR-WISE LAMINATION PRODUCTION"],
    [],
    ["Contractor Name", "Shifts", "Rolls", "Production (Mtrs)", "Output Net Wt (kg)", "Avg Coating (g/m)"],
  ];
  contractorSummary.forEach((c) => {
    contractorData.push([
      c.contractorName,
      c.shiftCount,
      c.rollCount,
      c.productionMtrs,
      c.netWtAfter,
      c.avgCoating,
    ]);
  });
  const wsContractor = XLSX.utils.aoa_to_sheet(contractorData);
  XLSX.utils.book_append_sheet(wb, wsContractor, "Contractor-wise");

  // 3. Operator-wise Sheet
  const operatorData: any[][] = [
    ["OPERATOR-WISE LAMINATION PRODUCTION"],
    [],
    ["Operator Name", "Shifts", "Rolls", "Production (Mtrs)", "Output Net Wt (kg)", "Avg Coating (g/m)"],
  ];
  operatorSummary.forEach((op) => {
    operatorData.push([
      op.operatorName,
      op.shiftCount,
      op.rollCount,
      op.productionMtrs,
      op.netWtAfter,
      op.avgCoating,
    ]);
  });
  const wsOperator = XLSX.utils.aoa_to_sheet(operatorData);
  XLSX.utils.book_append_sheet(wb, wsOperator, "Operator-wise");

  // 4. Quality-wise Sheet
  const qualityData: any[][] = [
    ["QUALITY-WISE LAMINATION PRODUCTION"],
    [],
    ["Quality", "Width / Size", "Rolls", "Production (Mtrs)", "Output Net Wt (kg)", "Avg Coating (g/m)"],
  ];
  qualitySummary.forEach((q) => {
    qualityData.push([
      q.quality,
      q.size || "—",
      q.rollCount,
      q.productionMtrs,
      q.netWtAfter,
      q.avgCoating,
    ]);
  });
  const wsQuality = XLSX.utils.aoa_to_sheet(qualityData);
  XLSX.utils.book_append_sheet(wb, wsQuality, "Quality-wise");

  XLSX.writeFile(wb, `Lamination_Production_Summary_${dateRange.from || "All"}_${dateRange.to || "All"}.xlsx`);
}
