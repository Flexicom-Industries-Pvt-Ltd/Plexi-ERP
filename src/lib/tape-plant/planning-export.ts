import * as XLSX from "xlsx";
import { RecipePlanItem } from "@/components/tape-plant/TapePlantPlanningSection";

export interface PlanningExportOptions {
  date: string;
  shiftName: string;
  status: string;
  plans: RecipePlanItem[];
}

export function generateTapePlantPlanningExcel({
  date,
  shiftName,
  status,
  plans,
}: PlanningExportOptions) {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: Master Shift Production & Formulation Plan (Long format)
  // -------------------------------------------------------------
  const titleRow = [
    "FLEXICOM INDUSTRIES PVT. LTD. - TAPE PLANT SHIFT PRODUCTION & MATERIAL PLAN",
  ];
  const metaRow1 = [
    `Date: ${date}`,
    `Shift: ${shiftName}`,
    `Status: ${status}`,
    `Total Recipe Runs: ${plans.length}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  const emptyRow: string[] = [];

  const headerRow = [
    "Run #",
    "Recipe Quality Code",
    "Tape Type",
    "Denier",
    "Tape Width (mm)",
    "Strength (gpd)",
    "ELO %",
    "Bobbin Marking",
    "Colour",
    "Spacer Size",
    "Required Ash",
    "Ash %",
    "Omega",
    "Vist %",
    "Planned Qty (KG)",
    "PP Qty (KG)",
    "PP (%)",
    "CC Qty (KG)",
    "CC (%)",
    "MB Qty (KG)",
    "MB (%)",
    "RP1 Qty (KG)",
    "RP1 (%)",
    "RP2 Qty (KG)",
    "RP2 (%)",
    "HD RP Qty (KG)",
    "HD RP (%)",
    "TPT Qty (KG)",
    "TPT (%)",
    "Other Qty (KG)",
    "Total Batch Qty (KG)",
    "Total Blend (%)",
    "Remarks",
  ];

  const dataRows: (string | number)[][] = [];

  let totalPlannedSum = 0;
  let totalPPSum = 0;
  let totalCCSum = 0;
  let totalMBSum = 0;
  let totalRP1Sum = 0;
  let totalRP2Sum = 0;
  let totalHDRPSum = 0;
  let totalTPTSum = 0;
  let totalOtherSum = 0;
  let totalBatchSum = 0;

  plans.forEach((plan, idx) => {
    const plannedQty = Number(plan.plannedQtyKg) || 0;
    totalPlannedSum += plannedQty;

    // Extract material items
    const getMat = (name: string): { qty: number; pct: number } => {
      const match = plan.materials?.find(
        (m) => m.material.trim().toUpperCase() === name.toUpperCase()
      );
      return {
        qty: match && Number(match.quantity) ? Number(match.quantity) : 0,
        pct: match && Number(match.percentage) ? Number(match.percentage) : 0,
      };
    };

    const pp = getMat("PP");
    const cc = getMat("CC");
    const mb = getMat("MB");
    const rp1 = getMat("RP1");
    const rp2 = getMat("RP2");
    const hdrp = getMat("HD RP");
    const tpt = getMat("TPT");

    // Other materials
    const knownSet = new Set(["PP", "CC", "MB", "RP1", "RP2", "HD RP", "TPT"]);
    let otherQty = 0;
    let totalBlendPct = 0;
    let totalBatchQty = 0;

    (plan.materials || []).forEach((m) => {
      const q = Number(m.quantity) || 0;
      const p = Number(m.percentage) || 0;
      totalBatchQty += q;
      totalBlendPct += p;
      if (!knownSet.has(m.material.trim().toUpperCase())) {
        otherQty += q;
      }
    });

    totalPPSum += pp.qty;
    totalCCSum += cc.qty;
    totalMBSum += mb.qty;
    totalRP1Sum += rp1.qty;
    totalRP2Sum += rp2.qty;
    totalHDRPSum += hdrp.qty;
    totalTPTSum += tpt.qty;
    totalOtherSum += otherQty;
    totalBatchSum += totalBatchQty;

    dataRows.push([
      idx + 1,
      plan.recipeQuality || `Recipe #${idx + 1}`,
      plan.tapeType || "LPP",
      plan.denier !== "" ? Number(plan.denier) : "",
      plan.tapeWidth !== "" ? Number(plan.tapeWidth) : "",
      plan.strength !== "" ? Number(plan.strength) : "",
      plan.eloPercent !== "" ? Number(plan.eloPercent) : "",
      plan.bobbinMarking || "",
      plan.colour || "",
      plan.spacerSize || "",
      plan.requiredAsh !== "" ? Number(plan.requiredAsh) : "",
      plan.ashPercent !== "" ? Number(plan.ashPercent) : "",
      plan.omega || "",
      plan.vistPercent !== "" ? Number(plan.vistPercent) : "",
      plannedQty,
      pp.qty || "",
      pp.pct ? `${pp.pct}%` : "",
      cc.qty || "",
      cc.pct ? `${cc.pct}%` : "",
      mb.qty || "",
      mb.pct ? `${mb.pct}%` : "",
      rp1.qty || "",
      rp1.pct ? `${rp1.pct}%` : "",
      rp2.qty || "",
      rp2.pct ? `${rp2.pct}%` : "",
      hdrp.qty || "",
      hdrp.pct ? `${hdrp.pct}%` : "",
      tpt.qty || "",
      tpt.pct ? `${tpt.pct}%` : "",
      otherQty || "",
      totalBatchQty || plannedQty,
      `${totalBlendPct.toFixed(1)}%`,
      [plan.isDayNight ? "[Day+Night 24h Continuous Run]" : "", plan.remarks || ""].filter(Boolean).join(" "),
    ]);
  });

  // Total Summary Row
  const totalRow = [
    "TOTAL",
    `Total Runs: ${plans.length}`,
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    "—",
    totalPlannedSum,
    totalPPSum,
    "—",
    totalCCSum,
    "—",
    totalMBSum,
    "—",
    totalRP1Sum,
    "—",
    totalRP2Sum,
    "—",
    totalHDRPSum,
    "—",
    totalTPTSum,
    "—",
    totalOtherSum,
    totalBatchSum,
    "—",
    "",
  ];

  const sheet1Data = [
    titleRow,
    metaRow1,
    emptyRow,
    headerRow,
    ...dataRows,
    emptyRow,
    totalRow,
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Column widths for Sheet 1
  ws1["!cols"] = [
    { wch: 8 }, // Run #
    { wch: 28 }, // Recipe Quality
    { wch: 12 }, // Type
    { wch: 10 }, // Denier
    { wch: 16 }, // Tape Width
    { wch: 14 }, // Strength
    { wch: 10 }, // ELO %
    { wch: 16 }, // Bobbin Marking
    { wch: 16 }, // Colour
    { wch: 14 }, // Spacer Size
    { wch: 14 }, // Required Ash
    { wch: 10 }, // Ash %
    { wch: 12 }, // Omega
    { wch: 10 }, // Vist %
    { wch: 18 }, // Planned Qty
    { wch: 14 }, // PP kg
    { wch: 10 }, // PP %
    { wch: 14 }, // CC kg
    { wch: 10 }, // CC %
    { wch: 14 }, // MB kg
    { wch: 10 }, // MB %
    { wch: 14 }, // RP1 kg
    { wch: 10 }, // RP1 %
    { wch: 14 }, // RP2 kg
    { wch: 10 }, // RP2 %
    { wch: 14 }, // HD RP kg
    { wch: 10 }, // HD RP %
    { wch: 14 }, // TPT kg
    { wch: 10 }, // TPT %
    { wch: 14 }, // Other kg
    { wch: 20 }, // Total Batch kg
    { wch: 16 }, // Total Blend %
    { wch: 30 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Shift Production Plan");

  // -------------------------------------------------------------
  // Sheet 2: Consolidated Shift Material Requirements
  // -------------------------------------------------------------
  const matRequirementsHeader = [
    "Raw Material Name",
    "Total Required (KG)",
    "Shift Consumption Share (%)",
  ];

  const matAggregates: Record<string, number> = {};
  plans.forEach((p) => {
    (p.materials || []).forEach((m) => {
      const name = m.material.trim().toUpperCase() || "UNKNOWN";
      const q = Number(m.quantity) || 0;
      matAggregates[name] = (matAggregates[name] || 0) + q;
    });
  });

  const totalAggKg = Object.values(matAggregates).reduce((a, b) => a + b, 0);

  const matRows = Object.entries(matAggregates).map(([mat, kg]) => [
    mat,
    kg,
    totalAggKg > 0 ? `${((kg / totalAggKg) * 100).toFixed(2)}%` : "0.00%",
  ]);

  const sheet2Data = [
    ["FLEXICOM INDUSTRIES PVT. LTD. - RAW MATERIAL REQUIREMENTS SUMMARY"],
    [`Date: ${date}`, `Shift: ${shiftName}`, `Total Material: ${totalAggKg.toLocaleString()} KG`],
    emptyRow,
    matRequirementsHeader,
    ...matRows,
    emptyRow,
    ["TOTAL MATERIAL DEMAND", totalAggKg, "100.00%"],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2["!cols"] = [{ wch: 24 }, { wch: 22 }, { wch: 28 }];

  XLSX.utils.book_append_sheet(wb, ws2, "Material Requirements");

  // Export File
  const fileName = `Tape_Plant_Planning_${date}_${shiftName.replace(/\s+/g, "_")}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
