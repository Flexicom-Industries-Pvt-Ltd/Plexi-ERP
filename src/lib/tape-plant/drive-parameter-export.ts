import * as XLSX from "xlsx";
import { DriveParameterPrintData } from "./print-drive-parameter-sheet";

export function exportTapePlantDriveExcel(data: DriveParameterPrintData): void {
  const { date, shiftName, operatorName, status = "SAVED", records } = data;
  const wb = XLSX.utils.book_new();

  const titleRow = [
    "FLEXICOM INDUSTRIES PVT. LTD. - TAPE PLANT PROCESS DRIVE PARAMETERS TELEMETRY REPORT",
  ];
  const metaRow = [
    `Date: ${date}`,
    `Shift: ${shiftName}`,
    `Operator: ${operatorName || "Unassigned"}`,
    `Status: ${status}`,
    `Total Slots: ${records.length}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];

  const headers = [
    "SL",
    "Time",
    "Photo Verified",
    "Extruder RPM",
    "Melt Pump RPM",
    "Take-up MPM",
    "Nip Roll MPM",
    "ISU MPM",
    "P.A.U MPM",
    "Stretching MPM",
    "Annealing MPM",
    "Stretch Ratio",
    "Pressure P1 (bar)",
    "Pressure P2 (bar)",
    "Pressure P3 (bar)",
    "Water Bath (°C)",
    "Colour",
    "Denier (D)",
    "Tape Width (mm)",
    "Strength (gpd)",
    "ELO %",
    "Spacer Width (mm)",
    "No. of Tapes",
  ];

  const dataRows = records.map((r, index) => {
    return [
      index + 1,
      r.time || "",
      r.photoUrl ? "YES" : "NO",
      r.extruderRpm !== "" ? Number(r.extruderRpm) || r.extruderRpm : "",
      r.meltPumpRpm !== "" ? Number(r.meltPumpRpm) || r.meltPumpRpm : "",
      r.takeUpMpm !== "" ? Number(r.takeUpMpm) || r.takeUpMpm : "",
      r.nipRollMpm !== "" ? Number(r.nipRollMpm) || r.nipRollMpm : "",
      r.isuMpm !== "" ? Number(r.isuMpm) || r.isuMpm : "",
      r.pauMpm !== "" ? Number(r.pauMpm) || r.pauMpm : "",
      r.stretchingMpm !== "" ? Number(r.stretchingMpm) || r.stretchingMpm : "",
      r.annealingMpm !== "" ? Number(r.annealingMpm) || r.annealingMpm : "",
      r.stretchingRatio !== "" ? Number(r.stretchingRatio) || r.stretchingRatio : "",
      r.meltPressureP1 !== "" ? Number(r.meltPressureP1) || r.meltPressureP1 : "",
      r.meltPressureP2 !== "" ? Number(r.meltPressureP2) || r.meltPressureP2 : "",
      r.meltPressureP3 !== "" ? Number(r.meltPressureP3) || r.meltPressureP3 : "",
      r.waterBath !== "" ? Number(r.waterBath) || r.waterBath : "",
      r.colour || "",
      r.denier !== "" ? Number(r.denier) || r.denier : "",
      r.tapeWidth !== "" ? Number(r.tapeWidth) || r.tapeWidth : "",
      r.strength !== "" ? Number(r.strength) || r.strength : "",
      r.eloPercent !== "" ? Number(r.eloPercent) || r.eloPercent : "",
      r.spacerWidth !== "" ? Number(r.spacerWidth) || r.spacerWidth : "",
      r.numberOfTape !== "" ? Number(r.numberOfTape) || r.numberOfTape : "",
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([
    titleRow,
    metaRow,
    [], // blank spacer
    headers,
    ...dataRows,
  ]);

  // Set column widths
  ws["!cols"] = [
    { wch: 6 },  // SL
    { wch: 10 }, // Time
    { wch: 14 }, // Photo
    { wch: 14 }, // Extruder RPM
    { wch: 14 }, // Melt Pump RPM
    { wch: 13 }, // Take-up
    { wch: 13 }, // Nip Roll
    { wch: 10 }, // ISU
    { wch: 10 }, // PAU
    { wch: 14 }, // Stretch MPM
    { wch: 14 }, // Anneal MPM
    { wch: 13 }, // Stretch Ratio
    { wch: 16 }, // P1
    { wch: 16 }, // P2
    { wch: 16 }, // P3
    { wch: 15 }, // Water Bath
    { wch: 12 }, // Colour
    { wch: 12 }, // Denier
    { wch: 15 }, // Tape Width
    { wch: 14 }, // Strength
    { wch: 10 }, // ELO %
    { wch: 16 }, // Spacer
    { wch: 14 }, // No. of Tapes
  ];

  const sheetName = `Drive_${(shiftName || "Shift").slice(0, 10)}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const cleanShift = (shiftName || "shift").toLowerCase().replace(/\s+/g, "_");
  const filename = `Tape_Plant_Drive_${cleanDate}_${cleanShift}.xlsx`;

  XLSX.writeFile(wb, filename);
}
