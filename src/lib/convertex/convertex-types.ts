export interface ConvertexReportItem {
  id?: string;
  sequence: number;
  companyName?: string;
  unitName?: string;
  grade?: string;
  targetProductionPcs?: number;
  partyName?: string;
  rollNumber: string;
  loomNumber?: string;
  rollMtr: number;
  netWeight: number;
  avgWeight: number; // in g/m: (netWeight / rollMtr) * 1000
  openingMeterReading: number;
  closingMeterReading: number;
  productionPcs: number; // pieces produced
  loomFabricWasteKg: number;
  lamFabricWasteKg: number;
  printFabricWasteKg: number;
  machineWasteKg: number;
  totalWastageKg: number; // loom + lam + print + machine
  totalWastagePct: number; // (totalWastageKg / netWeight) * 100
  totalWastageMtdKg?: number; // MTD aggregate
  remarks?: string;
}

export interface ConvertexDailyReportData {
  id?: string;
  date: string;
  shiftName: string;
  machineNo: string;
  companyName?: string;
  unitName?: string;
  operatorName?: string;
  operatorId?: string;
  supervisorName?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string;
  totalRolls: number;
  totalRollMtr: number;
  totalNetWt: number;
  avgWeightGsm: number;
  totalProductionPcs: number;
  totalTargetPcs: number;
  totalLoomWasteKg: number;
  totalLamWasteKg: number;
  totalPrintWasteKg: number;
  totalMachineWasteKg: number;
  totalWastageKg: number;
  totalWastagePct: number;
  totalWastageMtdKg: number;
  entries: ConvertexReportItem[];
}

export interface ConvertexShiftTotals {
  totalRolls: number;
  totalRollMtr: number;
  totalNetWt: number;
  avgWeightGsm: number;
  totalProductionPcs: number;
  totalTargetPcs: number;
  totalLoomWasteKg: number;
  totalLamWasteKg: number;
  totalPrintWasteKg: number;
  totalMachineWasteKg: number;
  totalWastageKg: number;
  totalWastagePct: number;
  totalWastageMtdKg: number;
}

/**
 * Calculates derived metrics for an individual Convertex roll row.
 */
export function calculateConvertexRow(item: Partial<ConvertexReportItem>): ConvertexReportItem {
  const sequence = Number(item.sequence) || 1;
  const rollMtr = Math.max(0, Number(item.rollMtr) || 0);
  const netWeight = Math.max(0, Number(item.netWeight) || 0);
  const openingMeterReading = Math.max(0, Number(item.openingMeterReading) || 0);
  const closingMeterReading = Math.max(0, Number(item.closingMeterReading) || 0);

  // Average weight in g/m: (Net Weight in kg / Roll Metre) * 1000
  const avgWeight = rollMtr > 0 ? (netWeight / rollMtr) * 1000 : 0;

  // Production in Pcs: if user supplied explicit productionPcs, use it; otherwise compute closing - opening
  let productionPcs = Number(item.productionPcs);
  if (isNaN(productionPcs) || productionPcs <= 0) {
    productionPcs = closingMeterReading >= openingMeterReading && openingMeterReading > 0
      ? closingMeterReading - openingMeterReading
      : 0;
  }

  // Wastages
  const loomFabricWasteKg = Math.max(0, Number(item.loomFabricWasteKg) || 0);
  const lamFabricWasteKg = Math.max(0, Number(item.lamFabricWasteKg) || 0);
  const printFabricWasteKg = Math.max(0, Number(item.printFabricWasteKg) || 0);
  const machineWasteKg = Math.max(0, Number(item.machineWasteKg) || 0);

  const totalWastageKg = loomFabricWasteKg + lamFabricWasteKg + printFabricWasteKg + machineWasteKg;
  const totalWastagePct = netWeight > 0 ? (totalWastageKg / netWeight) * 100 : 0;
  const totalWastageMtdKg = Math.max(0, Number(item.totalWastageMtdKg) || 0);

  return {
    id: item.id,
    sequence,
    companyName: item.companyName || "",
    unitName: item.unitName || "",
    grade: item.grade || "",
    targetProductionPcs: Number(item.targetProductionPcs) || 0,
    partyName: item.partyName || "",
    rollNumber: String(item.rollNumber || "").trim(),
    loomNumber: String(item.loomNumber || "").trim(),
    rollMtr: Math.round(rollMtr * 100) / 100,
    netWeight: Math.round(netWeight * 100) / 100,
    avgWeight: Math.round(avgWeight * 100) / 100,
    openingMeterReading: Math.round(openingMeterReading * 100) / 100,
    closingMeterReading: Math.round(closingMeterReading * 100) / 100,
    productionPcs: Math.round(productionPcs),
    loomFabricWasteKg: Math.round(loomFabricWasteKg * 100) / 100,
    lamFabricWasteKg: Math.round(lamFabricWasteKg * 100) / 100,
    printFabricWasteKg: Math.round(printFabricWasteKg * 100) / 100,
    machineWasteKg: Math.round(machineWasteKg * 100) / 100,
    totalWastageKg: Math.round(totalWastageKg * 100) / 100,
    totalWastagePct: Math.round(totalWastagePct * 100) / 100,
    totalWastageMtdKg: Math.round(totalWastageMtdKg * 100) / 100,
    remarks: item.remarks || "",
  };
}

/**
 * Computes aggregate summary totals across an entire shift's Convertex entries.
 */
export function computeConvertexTotals(entries: ConvertexReportItem[]): ConvertexShiftTotals {
  let totalRolls = 0;
  let totalRollMtr = 0;
  let totalNetWt = 0;
  let totalProductionPcs = 0;
  let totalTargetPcs = 0;
  let totalLoomWasteKg = 0;
  let totalLamWasteKg = 0;
  let totalPrintWasteKg = 0;
  let totalMachineWasteKg = 0;
  let totalWastageKg = 0;
  let totalWastageMtdKg = 0;

  for (const entry of entries) {
    if (entry.rollNumber && entry.rollNumber.trim() !== "") {
      totalRolls += 1;
    }
    totalRollMtr += Number(entry.rollMtr) || 0;
    totalNetWt += Number(entry.netWeight) || 0;
    totalProductionPcs += Number(entry.productionPcs) || 0;
    totalTargetPcs += Number(entry.targetProductionPcs) || 0;
    totalLoomWasteKg += Number(entry.loomFabricWasteKg) || 0;
    totalLamWasteKg += Number(entry.lamFabricWasteKg) || 0;
    totalPrintWasteKg += Number(entry.printFabricWasteKg) || 0;
    totalMachineWasteKg += Number(entry.machineWasteKg) || 0;
    totalWastageKg += Number(entry.totalWastageKg) || 0;
    // MTD from the last row or maximum value if present
    if (entry.totalWastageMtdKg && entry.totalWastageMtdKg > totalWastageMtdKg) {
      totalWastageMtdKg = entry.totalWastageMtdKg;
    }
  }

  const avgWeightGsm = totalRollMtr > 0 ? (totalNetWt / totalRollMtr) * 1000 : 0;
  const totalWastagePct = totalNetWt > 0 ? (totalWastageKg / totalNetWt) * 100 : 0;

  return {
    totalRolls,
    totalRollMtr: Math.round(totalRollMtr * 100) / 100,
    totalNetWt: Math.round(totalNetWt * 100) / 100,
    avgWeightGsm: Math.round(avgWeightGsm * 100) / 100,
    totalProductionPcs: Math.round(totalProductionPcs),
    totalTargetPcs: Math.round(totalTargetPcs),
    totalLoomWasteKg: Math.round(totalLoomWasteKg * 100) / 100,
    totalLamWasteKg: Math.round(totalLamWasteKg * 100) / 100,
    totalPrintWasteKg: Math.round(totalPrintWasteKg * 100) / 100,
    totalMachineWasteKg: Math.round(totalMachineWasteKg * 100) / 100,
    totalWastageKg: Math.round(totalWastageKg * 100) / 100,
    totalWastagePct: Math.round(totalWastagePct * 100) / 100,
    totalWastageMtdKg: Math.round(totalWastageMtdKg * 100) / 100,
  };
}
