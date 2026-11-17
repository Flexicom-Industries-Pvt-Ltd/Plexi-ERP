import * as XLSX from "xlsx";
import { RawMaterialPrintData } from "./print-raw-material-sheet";

export function exportTapePlantRawMaterialExcel(data: RawMaterialPrintData): void {
  const { date, shiftName, operatorName, status = "SAVED", records } = data;
  const wb = XLSX.utils.book_new();

  const titleRow = [
    "FLEXICOM INDUSTRIES PVT. LTD. - TAPE PLANT RAW MATERIAL MOVEMENT REPORT",
  ];
  const metaRow = [
    `Date: ${date}`,
    `Shift: ${shiftName}`,
    `Operator: ${operatorName || "Unassigned"}`,
    `Status: ${status}`,
    `Total Materials: ${records.length}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];

  const headers = [
    "SL",
    "Raw Material",
    "Grade",
    "Photo Verified",
    "Opening (KG)",
    "Received (KG)",
    "Total (KG)",
    "Consumption (KG)",
    "Closing (KG)",
    "Setting %",
    "Actual %",
    "Wastage (KG)",
  ];

  let totOpening = 0;
  let totReceived = 0;
  let totAvailable = 0;
  let totConsumption = 0;
  let totClosing = 0;
  let totSettingPercent = 0;
  let totActualPercent = 0;
  let totWastage = 0;

  const dataRows = records.map((r, index) => {
    const open = Number(r.openingStock) || 0;
    const rec = Number(r.received) || 0;
    const avail = open + rec;
    const cons = Number(r.consumption) || 0;
    const close = avail - cons;
    const setP = Number(r.settingPercent) || 0;
    const actP = Number(r.actualPercent) || 0;
    const wst = Number(r.wastage) || 0;

    totOpening += open;
    totReceived += rec;
    totAvailable += avail;
    totConsumption += cons;
    totClosing += close;
    totSettingPercent += setP;
    totActualPercent += actP;
    totWastage += wst;

    return [
      index + 1,
      r.material || "",
      r.grade || "",
      r.photoUrl ? "YES" : "NO",
      r.openingStock !== "" ? open : "",
      r.received !== "" ? rec : "",
      avail,
      r.consumption !== "" ? cons : "",
      close,
      r.settingPercent !== "" ? setP : "",
      r.actualPercent !== "" ? actP : "",
      r.wastage !== "" ? wst : "",
    ];
  });

  const totalsRow = [
    "TOTAL",
    "",
    "",
    "",
    totOpening,
    totReceived,
    totAvailable,
    totConsumption,
    totClosing,
    totSettingPercent,
    totActualPercent,
    totWastage,
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    titleRow,
    metaRow,
    [], // spacer
    headers,
    ...dataRows,
    totalsRow,
  ]);

  ws["!cols"] = [
    { wch: 6 },  // SL
    { wch: 16 }, // Material
    { wch: 14 }, // Grade
    { wch: 14 }, // Photo
    { wch: 14 }, // Opening
    { wch: 14 }, // Received
    { wch: 14 }, // Total
    { wch: 16 }, // Consumption
    { wch: 14 }, // Closing
    { wch: 12 }, // Setting %
    { wch: 12 }, // Actual %
    { wch: 14 }, // Wastage
  ];

  const sheetName = `RM_${(shiftName || "Shift").slice(0, 10)}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const cleanShift = (shiftName || "shift").toLowerCase().replace(/\s+/g, "_");
  const filename = `Tape_Plant_Raw_Material_${cleanDate}_${cleanShift}.xlsx`;

  XLSX.writeFile(wb, filename);
}
