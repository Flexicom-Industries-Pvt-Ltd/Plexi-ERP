import { describe, it, expect, vi } from "vitest";
import { exportLoomChangeoverExcel, LoomChangeoverExportOptions } from "../loom-changeover-export";
import { generateLoomChangeoverHtml, PrintLoomChangeoverOptions } from "../print-loom-changeover";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<any>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("Loom Changeover Log-Wise Export & Print Engine", () => {
  const mockChangeoverLogs: LoomChangeoverExportOptions = {
    logs: [
      {
        id: "rs_entry_1",
        source: "READING_SHEET",
        date: "2026-09-27",
        shiftName: "Day Shift",
        loomNumber: 31,
        operatorName: "Ravinder Kumar",
        fromQuality: "Mahal/LPP/W",
        toQuality: "UTCL/LPP/Y/67",
        downtimeMinutes: 45,
        status: "CHANGEOVER",
        remarks: "Swapped weft bobbins to yellow",
        loggedBy: "Loom Incharge",
        createdAt: new Date().toISOString(),
      },
      {
        id: "sc_entry_2",
        source: "SCHEDULED",
        date: "2026-09-27",
        shiftName: "Night Shift",
        loomNumber: 42,
        operatorName: "—",
        fromQuality: "1000D White Standard",
        toQuality: "850D Milky White",
        downtimeMinutes: 0,
        status: "SCHEDULED",
        remarks: "Planned reed adjustment",
        loggedBy: "Planner",
        createdAt: new Date().toISOString(),
      },
    ],
    kpis: {
      totalLogs: 2,
      totalDowntimeMinutes: 45,
      totalDowntimeHours: 0.8,
      avgDowntimeMinutes: 22.5,
      uniqueLoomsCount: 2,
      scheduledCount: 1,
      factoryTotalLooms: 91,
    },
    filterDate: "2026-09-27",
    filterShift: "All Shifts",
    searchQuery: "",
  };

  it("should export Changeover Logs Excel workbook correctly", () => {
    exportLoomChangeoverExcel(mockChangeoverLogs);

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const lastCall = calls[calls.length - 1];
    const wb = lastCall[0];
    const filename = lastCall[1];

    expect(filename).toContain("Loom_Changeover_Logs_");
    expect(wb.SheetNames).toContain("Changeover Logs");
  });

  it("should generate valid Changeover printable HTML with branding and signoffs", () => {
    const html = generateLoomChangeoverHtml(mockChangeoverLogs as PrintLoomChangeoverOptions);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Flexicom Industries Pvt. Limited");
    expect(html).toContain("CIRCULAR LOOMS QUALITY CHANGEOVER AUDIT LOG");
    expect(html).toContain("#31");
    expect(html).toContain("Ravinder Kumar");
    expect(html).toContain("Mahal/LPP/W");
    expect(html).toContain("UTCL/LPP/Y/67");
    expect(html).toContain("45m");
    expect(html).toContain("Prepared By (Floor Operator)");
    expect(html).toContain("Weaving Supervisor");
    expect(html).toContain("Plant In-Charge");
  });
});
