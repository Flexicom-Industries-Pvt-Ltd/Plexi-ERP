/**
 * Recycling Plant (RP) Domain Types, Defaults & Calculation Engine
 * Covers:
 * 1. Wastage Collection Report (Sheet 1)
 * 2. R.P. Plant Production Report (Sheet 2)
 */

export type RpReportStatus = "DRAFT" | "SUBMITTED" | "APPROVED";

export function round2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function safeNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

// ==========================================
// SHEET 1: WASTAGE COLLECTION REPORT TYPES
// ==========================================

export interface WastageCollectionRow {
  id: string;
  label: string;
  isCustom?: boolean;
  shifts: Record<string, number>;
  mtdShifts: Record<string, number>;
  total: number;
}

export interface WastageCollectionSection {
  key: string;
  title: string;
  rows: WastageCollectionRow[];
  sectionShiftTotals: Record<string, number>;
  sectionMtdShiftTotals: Record<string, number>;
  sectionTotal: number;
}

export interface BobbinCleaningRow {
  key: string;
  label: string;
  day: number;
  mtd: number;
}

export interface SegregationRow {
  key: string;
  label: string;
  qty: number;
}

export interface OldBobbinCuttingRow {
  key: string;
  label: string;
  day: number;
  mtd: number;
}

export interface WastageMarginBlocks {
  bobbinCleaning: {
    rows: BobbinCleaningRow[];
    totalDay: number;
    totalMtd: number;
  };
  segregation: {
    rows: SegregationRow[];
    total: number;
  };
  oldBobbinCutting: {
    rows: OldBobbinCuttingRow[];
    totalDay: number;
    totalMtd: number;
    cuttexSmallRollWastage: number;
  };
  noteBox: {
    bCleaning: number;
    rpLums: number;
    summary: number;
    total: number;
  };
}

export interface RpWastageCollectionData {
  id?: string;
  serialNo: number;
  date: string;
  shiftNames: string[];
  operatorName: string;
  operatorId?: string | null;
  supervisorName: string;
  sections: WastageCollectionSection[];
  marginBlocks: WastageMarginBlocks;
  summaryTotalKg: number;
  grandTotalKg: number;
  status: RpReportStatus;
  remarks: string;
}

export const DEFAULT_WASTAGE_SECTION_TEMPLATES: Array<{
  key: string;
  title: string;
  rows: Array<{ id: string; label: string }>;
}> = [
  {
    key: "TAPE_PLANT",
    title: "TAPE PLANT SECTION",
    rows: [
      { id: "tp-yellow", label: "YELLOW" },
      { id: "tp-white", label: "WHITE" },
      { id: "tp-green", label: "GREEN" },
      { id: "tp-lums", label: "LUMS" },
    ],
  },
  {
    key: "LOOM",
    title: "LOOM SECTION",
    rows: [
      { id: "loom-yellow", label: "YELLOW" },
      { id: "loom-white", label: "WHITE" },
      { id: "loom-green", label: "GREEN" },
      { id: "loom-mix", label: "MIX" },
    ],
  },
  {
    key: "LAMINATION",
    title: "LAMINATION SECTION",
    rows: [
      { id: "lam-fabric", label: "FABRIC" },
      { id: "lam-lums", label: "LUMS" },
    ],
  },
  {
    key: "VALVOMATIC",
    title: "VALVOMATIC SECTION",
    rows: [
      { id: "val-bag", label: "BAG WASTAGE" },
      { id: "val-seg", label: "SEG" },
    ],
  },
  {
    key: "CUTTEX",
    title: "CUTTEX SECTION",
    rows: [
      { id: "cut-wastage", label: "WASTAGE" },
      { id: "cut-fab", label: "FAB" },
    ],
  },
  {
    key: "AD_CONVERTEX",
    title: "AD CONVERTEX",
    rows: [
      { id: "ad-wastage", label: "WASTAGE" },
      { id: "ad-seg", label: "SEG" },
    ],
  },
  {
    key: "PIPE_CUTTING",
    title: "PIPE CUTTING",
    rows: [
      { id: "pipe-yellow", label: "YELLOW" },
      { id: "pipe-green", label: "GREEN" },
      { id: "pipe-white", label: "WHITE" },
      { id: "pipe-mix", label: "MIX" },
    ],
  },
  {
    key: "PRINTING",
    title: "PRINTING SECTION",
    rows: [
      { id: "prt-fabric", label: "FABRIC WASTAGE" },
      { id: "prt-loom-lam", label: "LOOM LAM" },
    ],
  },
];

export function createDefaultMarginBlocks(): WastageMarginBlocks {
  return {
    bobbinCleaning: {
      rows: [
        { key: "YELLOW", label: "Yellow (Y)", day: 0, mtd: 0 },
        { key: "WHITE", label: "White (W)", day: 0, mtd: 0 },
        { key: "GREEN", label: "Green (G)", day: 0, mtd: 0 },
        { key: "MIX", label: "Mix (M)", day: 0, mtd: 0 },
      ],
      totalDay: 0,
      totalMtd: 0,
    },
    segregation: {
      rows: [
        { key: "LOOM", label: "LOOM", qty: 0 },
        { key: "AD", label: "AD", qty: 0 },
        { key: "LAM", label: "Lam.", qty: 0 },
        { key: "PRINT", label: "Print.", qty: 0 },
      ],
      total: 0,
    },
    oldBobbinCutting: {
      rows: [
        { key: "YELLOW", label: "Yellow (Y)", day: 0, mtd: 0 },
        { key: "WHITE", label: "White (W)", day: 0, mtd: 0 },
        { key: "MIX", label: "Mix (M)", day: 0, mtd: 0 },
      ],
      totalDay: 0,
      totalMtd: 0,
      cuttexSmallRollWastage: 0,
    },
    noteBox: {
      bCleaning: 0,
      rpLums: 0,
      summary: 0,
      total: 0,
    },
  };
}

export function createDefaultWastageReport(
  date: string,
  shiftNames: string[],
  serialNo = 1
): RpWastageCollectionData {
  const emptyShifts = (): Record<string, number> =>
    Object.fromEntries(shiftNames.map((s) => [s, 0]));

  const sections: WastageCollectionSection[] = DEFAULT_WASTAGE_SECTION_TEMPLATES.map(
    (tpl) => ({
      key: tpl.key,
      title: tpl.title,
      rows: tpl.rows.map((r) => ({
        id: r.id,
        label: r.label,
        isCustom: false,
        shifts: emptyShifts(),
        mtdShifts: emptyShifts(),
        total: 0,
      })),
      sectionShiftTotals: emptyShifts(),
      sectionMtdShiftTotals: emptyShifts(),
      sectionTotal: 0,
    })
  );

  return recalculateWastageReport(
    {
      serialNo,
      date,
      shiftNames,
      operatorName: "",
      operatorId: null,
      supervisorName: "",
      sections,
      marginBlocks: createDefaultMarginBlocks(),
      summaryTotalKg: 0,
      grandTotalKg: 0,
      status: "DRAFT",
      remarks: "",
    },
    shiftNames
  );
}

export function recalculateWastageReport(
  data: RpWastageCollectionData,
  activeShiftNames?: string[]
): RpWastageCollectionData {
  const shiftNames =
    activeShiftNames && activeShiftNames.length > 0
      ? activeShiftNames
      : data.shiftNames && data.shiftNames.length > 0
      ? data.shiftNames
      : ["Day Shift", "Night Shift"];

  let summaryTotalKg = 0;

  const sections: WastageCollectionSection[] = (data.sections || []).map((sec) => {
    const sectionShiftTotals: Record<string, number> = {};
    const sectionMtdShiftTotals: Record<string, number> = {};
    for (const s of shiftNames) {
      sectionShiftTotals[s] = 0;
      sectionMtdShiftTotals[s] = 0;
    }

    let sectionTotal = 0;

    const rows: WastageCollectionRow[] = (sec.rows || []).map((row) => {
      const normalizedShifts: Record<string, number> = {};
      const normalizedMtdShifts: Record<string, number> = {};
      let rowTotal = 0;

      for (const s of shiftNames) {
        const v = round2(Math.max(0, safeNum(row.shifts?.[s])));
        const mtdV = round2(Math.max(0, safeNum(row.mtdShifts?.[s])));
        normalizedShifts[s] = v;
        normalizedMtdShifts[s] = mtdV;
        rowTotal += v;
        sectionShiftTotals[s] = round2(sectionShiftTotals[s] + v);
        sectionMtdShiftTotals[s] = round2(sectionMtdShiftTotals[s] + mtdV);
      }

      rowTotal = round2(rowTotal);
      sectionTotal = round2(sectionTotal + rowTotal);

      return {
        ...row,
        shifts: normalizedShifts,
        mtdShifts: normalizedMtdShifts,
        total: rowTotal,
      };
    });

    summaryTotalKg = round2(summaryTotalKg + sectionTotal);

    return {
      ...sec,
      rows,
      sectionShiftTotals,
      sectionMtdShiftTotals,
      sectionTotal,
    };
  });

  const defaults = createDefaultMarginBlocks();
  const rawMargin = data.marginBlocks || defaults;

  const bcRows = (rawMargin.bobbinCleaning?.rows || defaults.bobbinCleaning.rows).map((r) => ({
    ...r,
    day: round2(Math.max(0, safeNum(r.day))),
    mtd: round2(Math.max(0, safeNum(r.mtd))),
  }));
  const bcTotalDay = round2(bcRows.reduce((sum, r) => sum + r.day, 0));
  const bcTotalMtd = round2(bcRows.reduce((sum, r) => sum + r.mtd, 0));

  const segRows = (rawMargin.segregation?.rows || defaults.segregation.rows).map((r) => ({
    ...r,
    qty: round2(Math.max(0, safeNum(r.qty))),
  }));
  const segTotal = round2(segRows.reduce((sum, r) => sum + r.qty, 0));

  const obcRows = (rawMargin.oldBobbinCutting?.rows || defaults.oldBobbinCutting.rows).map(
    (r) => ({
      ...r,
      day: round2(Math.max(0, safeNum(r.day))),
      mtd: round2(Math.max(0, safeNum(r.mtd))),
    })
  );
  const obcTotalDay = round2(obcRows.reduce((sum, r) => sum + r.day, 0));
  const obcTotalMtd = round2(obcRows.reduce((sum, r) => sum + r.mtd, 0));
  const cuttexSmallRollWastage = round2(
    Math.max(0, safeNum(rawMargin.oldBobbinCutting?.cuttexSmallRollWastage))
  );

  const rpLums = round2(Math.max(0, safeNum(rawMargin.noteBox?.rpLums)));
  const noteTotal = round2(summaryTotalKg + bcTotalDay + rpLums);

  return {
    ...data,
    shiftNames,
    sections,
    summaryTotalKg,
    grandTotalKg: noteTotal,
    marginBlocks: {
      bobbinCleaning: {
        rows: bcRows,
        totalDay: bcTotalDay,
        totalMtd: bcTotalMtd,
      },
      segregation: {
        rows: segRows,
        total: segTotal,
      },
      oldBobbinCutting: {
        rows: obcRows,
        totalDay: obcTotalDay,
        totalMtd: obcTotalMtd,
        cuttexSmallRollWastage,
      },
      noteBox: {
        bCleaning: bcTotalDay,
        rpLums,
        summary: summaryTotalKg,
        total: noteTotal,
      },
    },
  };
}

// ==========================================
// SHEET 2: R.P. PLANT PRODUCTION REPORT TYPES
// ==========================================

export interface RpProductionRow {
  id: string;
  seq: number;
  particular: string;
  color: string;
  isLumpsOnly?: boolean;
  isCustom?: boolean;
  openingStock: number;
  productionShifts: Record<string, number>;
  productionTotal: number;
  productionMtd: number;
  issuedToTapePlant: number;
  issuedToTapePlantMtd: number;
  lumpsOnDate: number;
  lumpsMtd: number;
  dispatchOnDate: number;
  dispatchMtd: number;
  closingStock: number;
  remarks?: string;
}

export interface RpProductionReportData {
  id?: string;
  serialNo: number;
  date: string;
  shiftNames: string[];
  operatorName: string;
  operatorId?: string | null;
  supervisorName: string;
  rows: RpProductionRow[];
  shiftProductionTotals?: Record<string, number>;
  totalOpeningStock: number;
  totalProductionOnDate: number;
  totalProductionMtd: number;
  totalIssuedToTapePlant: number;
  totalIssuedToTapePlantMtd: number;
  totalLumpsOnDate: number;
  totalLumpsMtd: number;
  totalDispatchOnDate: number;
  totalDispatchMtd: number;
  totalClosingStock: number;
  status: RpReportStatus;
  remarks: string;
}

export const DEFAULT_RP_PARTICULARS: Array<{
  id: string;
  particular: string;
  color: string;
  isLumpsOnly?: boolean;
}> = [
  { id: "rp-1", particular: "PP", color: "MIX" },
  { id: "rp-2", particular: "PP", color: "YELLOW" },
  { id: "rp-3", particular: "PP", color: "WHITE" },
  { id: "rp-4", particular: "PP", color: "GREEN" },
  { id: "rp-5", particular: "PP", color: "BLUE" },
  { id: "rp-6", particular: "PP", color: "ORANGE" },
  { id: "rp-7", particular: "PP", color: "LUMS", isLumpsOnly: true },
  { id: "rp-8", particular: "PP", color: "LD" },
  { id: "rp-9", particular: "ULTRA Y BAG", color: "BROWN" },
  { id: "rp-10", particular: "ULTRA WEATHER +", color: "GRENEESE" },
  { id: "rp-11", particular: "BAG MIX", color: "GRENEESE" },
  { id: "rp-12", particular: "AMBUJA BAG", color: "GREENEES" },
  { id: "rp-13", particular: "ACC BAG", color: "BROWN" },
  { id: "rp-14", particular: "POLYSURE BAG", color: "OFF WHITE" },
  { id: "rp-15", particular: "PATTI MIX", color: "RED" },
  { id: "rp-16", particular: "LUMS MIX", color: "40/60" },
  { id: "rp-17", particular: "RED PP", color: "" },
  { id: "rp-18", particular: "PATTI MIX", color: "" },
  { id: "rp-19", particular: "TAPE MIX", color: "" },
  { id: "rp-20", particular: "HD WHITE", color: "" },
  { id: "rp-21", particular: "HD MIX", color: "" },
  { id: "rp-22", particular: "DRL", color: "" },
];

export function createDefaultRpProductionReport(
  date: string,
  shiftNames: string[],
  serialNo = 1,
  previousDayReport?: RpProductionReportData | null
): RpProductionReportData {
  const emptyShifts = (): Record<string, number> =>
    Object.fromEntries(shiftNames.map((s) => [s, 0]));

  const sameMonthAsPrev =
    Boolean(previousDayReport?.date) &&
    previousDayReport!.date.slice(0, 7) === date.slice(0, 7);

  const sourceRows =
    previousDayReport && Array.isArray(previousDayReport.rows) && previousDayReport.rows.length > 0
      ? previousDayReport.rows
      : DEFAULT_RP_PARTICULARS.map((p, idx) => ({
          id: p.id,
          seq: idx + 1,
          particular: p.particular,
          color: p.color,
          isLumpsOnly: Boolean(p.isLumpsOnly),
          isCustom: false,
          openingStock: 0,
          productionShifts: emptyShifts(),
          productionTotal: 0,
          productionMtd: 0,
          issuedToTapePlant: 0,
          issuedToTapePlantMtd: 0,
          lumpsOnDate: 0,
          lumpsMtd: 0,
          dispatchOnDate: 0,
          dispatchMtd: 0,
          closingStock: 0,
          remarks: "",
        }));

  const rows: RpProductionRow[] = sourceRows.map((prev, idx) => {
    const isLumpsOnly = Boolean(prev.isLumpsOnly);
    const openingStock = isLumpsOnly ? 0 : round2(safeNum(prev.closingStock));
    return {
      id: prev.id || `rp-row-${idx + 1}`,
      seq: idx + 1,
      particular: prev.particular,
      color: prev.color || "",
      isLumpsOnly,
      isCustom: Boolean(prev.isCustom),
      openingStock,
      productionShifts: emptyShifts(),
      productionTotal: 0,
      productionMtd: sameMonthAsPrev ? round2(safeNum(prev.productionMtd)) : 0,
      issuedToTapePlant: 0,
      issuedToTapePlantMtd: sameMonthAsPrev ? round2(safeNum(prev.issuedToTapePlantMtd)) : 0,
      lumpsOnDate: 0,
      lumpsMtd: sameMonthAsPrev ? round2(safeNum(prev.lumpsMtd)) : 0,
      dispatchOnDate: 0,
      dispatchMtd: sameMonthAsPrev ? round2(safeNum(prev.dispatchMtd)) : 0,
      closingStock: openingStock,
      remarks: "",
    };
  });

  return recalculateRpProductionReport(
    {
      serialNo,
      date,
      shiftNames,
      operatorName: "",
      operatorId: null,
      supervisorName: "",
      rows,
      totalOpeningStock: 0,
      totalProductionOnDate: 0,
      totalProductionMtd: 0,
      totalIssuedToTapePlant: 0,
      totalIssuedToTapePlantMtd: 0,
      totalLumpsOnDate: 0,
      totalLumpsMtd: 0,
      totalDispatchOnDate: 0,
      totalDispatchMtd: 0,
      totalClosingStock: 0,
      status: "DRAFT",
      remarks: "",
    },
    shiftNames
  );
}

export function recalculateRpProductionReport(
  data: RpProductionReportData,
  activeShiftNames?: string[]
): RpProductionReportData {
  const shiftNames =
    activeShiftNames && activeShiftNames.length > 0
      ? activeShiftNames
      : data.shiftNames && data.shiftNames.length > 0
      ? data.shiftNames
      : ["Day Shift", "Night Shift"];

  const shiftProductionTotals: Record<string, number> = {};
  for (const s of shiftNames) {
    shiftProductionTotals[s] = 0;
  }

  let totalOpeningStock = 0;
  let totalProductionOnDate = 0;
  let totalProductionMtd = 0;
  let totalIssuedToTapePlant = 0;
  let totalIssuedToTapePlantMtd = 0;
  let totalLumpsOnDate = 0;
  let totalLumpsMtd = 0;
  let totalDispatchOnDate = 0;
  let totalDispatchMtd = 0;
  let totalClosingStock = 0;

  const rows: RpProductionRow[] = (data.rows || []).map((row, idx) => {
    const isLumpsOnly = Boolean(row.isLumpsOnly);
    const normalizedShifts: Record<string, number> = {};
    let prodTotal = 0;

    for (const s of shiftNames) {
      const val = round2(Math.max(0, safeNum(row.productionShifts?.[s])));
      normalizedShifts[s] = val;
      prodTotal += val;
      shiftProductionTotals[s] = round2(shiftProductionTotals[s] + val);
    }

    prodTotal = round2(prodTotal);
    const openingStock = isLumpsOnly ? 0 : round2(safeNum(row.openingStock));
    const issuedToTapePlant = round2(Math.max(0, safeNum(row.issuedToTapePlant)));
    const dispatchOnDate = round2(Math.max(0, safeNum(row.dispatchOnDate)));
    const lumpsOnDate = round2(Math.max(0, safeNum(row.lumpsOnDate)));

    const productionMtd = round2(Math.max(0, safeNum(row.productionMtd)));
    const issuedToTapePlantMtd = round2(Math.max(0, safeNum(row.issuedToTapePlantMtd)));
    const lumpsMtd = round2(Math.max(0, safeNum(row.lumpsMtd)));
    const dispatchMtd = round2(Math.max(0, safeNum(row.dispatchMtd)));

    const closingStock = isLumpsOnly
      ? 0
      : round2(openingStock + prodTotal - issuedToTapePlant - dispatchOnDate);

    totalOpeningStock = round2(totalOpeningStock + openingStock);
    totalProductionOnDate = round2(totalProductionOnDate + prodTotal);
    totalProductionMtd = round2(totalProductionMtd + productionMtd);
    totalIssuedToTapePlant = round2(totalIssuedToTapePlant + issuedToTapePlant);
    totalIssuedToTapePlantMtd = round2(totalIssuedToTapePlantMtd + issuedToTapePlantMtd);
    totalLumpsOnDate = round2(totalLumpsOnDate + lumpsOnDate);
    totalLumpsMtd = round2(totalLumpsMtd + lumpsMtd);
    totalDispatchOnDate = round2(totalDispatchOnDate + dispatchOnDate);
    totalDispatchMtd = round2(totalDispatchMtd + dispatchMtd);
    totalClosingStock = round2(totalClosingStock + closingStock);

    return {
      ...row,
      seq: idx + 1,
      openingStock,
      productionShifts: normalizedShifts,
      productionTotal: prodTotal,
      productionMtd,
      issuedToTapePlant,
      issuedToTapePlantMtd,
      lumpsOnDate,
      lumpsMtd,
      dispatchOnDate,
      dispatchMtd,
      closingStock,
    };
  });

  return {
    ...data,
    shiftNames,
    rows,
    shiftProductionTotals,
    totalOpeningStock,
    totalProductionOnDate,
    totalProductionMtd,
    totalIssuedToTapePlant,
    totalIssuedToTapePlantMtd,
    totalLumpsOnDate,
    totalLumpsMtd,
    totalDispatchOnDate,
    totalDispatchMtd,
    totalClosingStock,
  };
}
