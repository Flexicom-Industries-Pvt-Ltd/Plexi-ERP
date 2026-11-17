import * as XLSX from "xlsx";
import { TemperaturePrintData } from "./print-temperature-sheet";

export function exportTapePlantTemperatureExcel(data: TemperaturePrintData): void {
  const { date, shiftName, operatorName, status = "SAVED", readings } = data;
  const wb = XLSX.utils.book_new();

  const titleRow = [
    "FLEXICOM INDUSTRIES PVT. LTD. - TAPE PLANT PROCESS TEMPERATURE TELEMETRY REPORT",
  ];
  const metaRow = [
    `Date: ${date}`,
    `Shift: ${shiftName}`,
    `Operator: ${operatorName || "Unassigned"}`,
    `Status: ${status}`,
    `Total Slots: ${readings.length}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];

  const headers = [
    "SL",
    "Time",
    "Photo Verified",
    "B1 (°C)",
    "B2 (°C)",
    "B3 (°C)",
    "B4 (°C)",
    "B5 (°C)",
    "B6 (°C)",
    "B7 (°C)",
    "Screen Changer",
    "AD-1",
    "AD-2",
    "Melt Pump",
    "D-1",
    "D-2",
    "D-3",
    "D-4",
    "D-5",
    "D-6",
    "D-7",
    "Melt Temp (°C)",
    "Housing 1 (H1)",
    "Housing 2 (H2)",
    "Hot Air Temp (°C)",
  ];

  const dataRows = readings.map((r, index) => {
    return [
      index + 1,
      r.time || "",
      r.photoUrl ? "YES" : "NO",
      r.b1 !== "" ? Number(r.b1) || r.b1 : "",
      r.b2 !== "" ? Number(r.b2) || r.b2 : "",
      r.b3 !== "" ? Number(r.b3) || r.b3 : "",
      r.b4 !== "" ? Number(r.b4) || r.b4 : "",
      r.b5 !== "" ? Number(r.b5) || r.b5 : "",
      r.b6 !== "" ? Number(r.b6) || r.b6 : "",
      r.b7 !== "" ? Number(r.b7) || r.b7 : "",
      r.screenChanger !== "" ? Number(r.screenChanger) || r.screenChanger : "",
      r.ad1 !== "" ? Number(r.ad1) || r.ad1 : "",
      r.ad2 !== "" ? Number(r.ad2) || r.ad2 : "",
      r.meltPump !== "" ? Number(r.meltPump) || r.meltPump : "",
      r.d1 !== "" ? Number(r.d1) || r.d1 : "",
      r.d2 !== "" ? Number(r.d2) || r.d2 : "",
      r.d3 !== "" ? Number(r.d3) || r.d3 : "",
      r.d4 !== "" ? Number(r.d4) || r.d4 : "",
      r.d5 !== "" ? Number(r.d5) || r.d5 : "",
      r.d6 !== "" ? Number(r.d6) || r.d6 : "",
      r.d7 !== "" ? Number(r.d7) || r.d7 : "",
      r.meltTemp !== "" ? Number(r.meltTemp) || r.meltTemp : "",
      r.h1 !== "" ? Number(r.h1) || r.h1 : "",
      r.h2 !== "" ? Number(r.h2) || r.h2 : "",
      r.hotAirTemp !== "" ? Number(r.hotAirTemp) || r.hotAirTemp : "",
    ];
  });

  const sheetData = [
    titleRow,
    metaRow,
    [],
    headers,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws["!cols"] = [
    { wch: 6 },  // SL
    { wch: 10 }, // Time
    { wch: 14 }, // Photo Verified
    { wch: 10 }, // B1
    { wch: 10 }, // B2
    { wch: 10 }, // B3
    { wch: 10 }, // B4
    { wch: 10 }, // B5
    { wch: 10 }, // B6
    { wch: 10 }, // B7
    { wch: 15 }, // Screen Changer
    { wch: 10 }, // AD-1
    { wch: 10 }, // AD-2
    { wch: 12 }, // Melt Pump
    { wch: 10 }, // D-1
    { wch: 10 }, // D-2
    { wch: 10 }, // D-3
    { wch: 10 }, // D-4
    { wch: 10 }, // D-5
    { wch: 10 }, // D-6
    { wch: 10 }, // D-7
    { wch: 15 }, // Melt Temp
    { wch: 14 }, // H1
    { wch: 14 }, // H2
    { wch: 16 }, // Hot Air Temp
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Process Temperature");

  const cleanDate = (date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "-");
  const cleanShift = (shiftName || "Shift").replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Tape_Plant_Temperature_${cleanDate}_${cleanShift}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

