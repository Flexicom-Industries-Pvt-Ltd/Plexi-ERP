import * as XLSX from "xlsx";
import {
  calculateActualAshContent,
  calculatePermissibleTapeAsh,
  calculateProfileTotal,
  resolveRecipeProfileForMode,
  RecipeLikeRecord,
} from "./recipe-formulation";

export interface TapelineMasterExportRecord extends RecipeLikeRecord {
  vendor?: string | null;
  code: string;
  colour?: string | null;
  tapeType: string;
}

/** Exports Tape Plant Master Recipes in the dual-block Tapeline Master Excel format. */
export function exportTapelineMasterExcel(records: TapelineMasterExportRecord[]) {
  const wb = XLSX.utils.book_new();

  const row1: (string | number)[] = ["", "", "", "", "", "", "FLEXICOM INDUSTRIES PVT. LTD. - TAPELINE RECIPE MASTER"];
  const row2: (string | number)[] = [
    "",
    "",
    "",
    "",
    "",
    "",
    "WITHOUT RP",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "WITH RP",
  ];
  const row3: (string | number)[] = [
    "Vendor",
    "Actual Quality",
    "Colour",
    "Type",
    "Permissible Ash in Fab",
    "Permissible Ash in Tape",
    "PP",
    "CC",
    "LDPE 040",
    "MB",
    "Natural RP",
    "RP White",
    "RP Yellow",
    "Mixed RP",
    "TPT Filler",
    "Total",
    "Actual Ash Content",
    "PP",
    "CC",
    "LDPE 040",
    "MB",
    "Natural RP",
    "RP White",
    "RP Yellow",
    "Mixed RP",
    "TPT Filler",
    "Total",
    "Actual Ash Content",
  ];
  const row4: (string | number)[] = [
    "",
    "",
    "",
    "",
    "%",
    "%",
    0,
    0.8,
    0,
    0.4,
    0,
    0.1,
    0.12,
    0.12,
    0.8,
    1,
    "%",
    0,
    0.8,
    0,
    0.4,
    0,
    0.12,
    0.12,
    0.12,
    0.8,
    1,
    "%",
  ];

  const dataRows = records.map((r) => {
    const fabAsh = r.permissibleFabAsh ?? "";
    const tapeAsh =
      r.permissibleTapeAsh ??
      calculatePermissibleTapeAsh(r.tapeType, r.permissibleFabAsh) ??
      "";
    const wo = resolveRecipeProfileForMode(r, "WITHOUT_RP");
    const w = resolveRecipeProfileForMode(r, "WITH_RP");
    const woTotal = calculateProfileTotal(wo);
    const wTotal = calculateProfileTotal(w);
    const woAsh = calculateActualAshContent(wo, "WITHOUT_RP");
    const wAsh = calculateActualAshContent(w, "WITH_RP");

    return [
      r.vendor || "",
      r.code,
      r.colour || "",
      r.tapeType || "",
      fabAsh,
      tapeAsh,
      wo.ppPercent ?? 0,
      wo.ccPercent ?? 0,
      wo.ldpePercent ?? 0,
      wo.mbPercent ?? 0,
      wo.tptPercent ?? 0,
      wo.rp1Percent ?? 0,
      wo.rp2Percent ?? 0,
      wo.hdrpPercent ?? 0,
      wo.tptFillerPercent ?? 0,
      woTotal,
      woAsh,
      w.ppPercent ?? 0,
      w.ccPercent ?? 0,
      w.ldpePercent ?? 0,
      w.mbPercent ?? 0,
      w.tptPercent ?? 0,
      w.rp1Percent ?? 0,
      w.rp2Percent ?? 0,
      w.hdrpPercent ?? 0,
      w.tptFillerPercent ?? 0,
      wTotal,
      wAsh,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([row1, row2, row3, row4, ...dataRows]);
  ws["!merges"] = [
    { s: { r: 1, c: 6 }, e: { r: 1, c: 16 } }, // WITHOUT RP
    { s: { r: 1, c: 17 }, e: { r: 1, c: 27 } }, // WITH RP
  ];
  ws["!cols"] = [
    { wch: 11 },
    { wch: 28 },
    { wch: 10 },
    { wch: 7 },
    { wch: 12 },
    { wch: 12 },
    ...Array(22).fill({ wch: 10 }),
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Recipe Master");
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Tapeline_Master_Recipes_${stamp}.xlsx`);
}
