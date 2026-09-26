import { describe, it, expect, vi } from "vitest";
import { exportLoomChangeoverExcel, LoomChangeoverDataset } from "../loom-changeover-export";
import { generateLoomChangeoverHtml } from "../print-loom-changeover";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<any>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("Loom Changeover Export & Print Engine", () => {
  const mockChangeoverData: LoomChangeoverDataset = {
    looms: [
      {
        id: "loom_1",
        loomNumber: 1,
        currentQuality: "850D Milky White",
        currentColor: "White",
        currentColorGroup: "Standard",
        currentDenier: 850,
        currentReedSpace: 54,
        currentBobbinMark: "White Mark",
        currentMesh: "Standard",
        nextQualityCode: "1000D White Standard",
        nextColor: "White",
        nextColorGroup: "Standard",
        nextDenier: 1000,
        nextReedSpace: 56,
        nextBobbinMark: "Double Line",
        nextMesh: "Standard",
        sequence: 1,
        status: "SCHEDULED",
        targetDate: "2026-09-27",
        targetShiftId: "shift_day",
        targetShiftName: "Day Shift",
        remarks: "Reed expansion to 56cm",
        hasChangeover: true,
        isReedSpaceChanged: true,
        isColorChanged: false,
        isBobbinMarkChanged: true,
      },
      {
        id: "loom_2",
        loomNumber: 2,
        currentQuality: "1000D White Standard",
        currentColor: "White",
        currentColorGroup: "Standard",
        currentDenier: 1000,
        currentReedSpace: 56,
        currentBobbinMark: "Standard",
        currentMesh: "Standard",
        nextQualityCode: null,
        nextColor: null,
        nextColorGroup: null,
        nextDenier: null,
        nextReedSpace: null,
        nextBobbinMark: null,
        nextMesh: null,
        sequence: 0,
        status: "PENDING",
        targetDate: null,
        targetShiftId: null,
        targetShiftName: null,
        remarks: null,
        hasChangeover: false,
        isReedSpaceChanged: false,
        isColorChanged: false,
        isBobbinMarkChanged: false,
      },
    ],
    allLooms: [
      {
        id: "loom_1",
        loomNumber: 1,
        currentQuality: "850D Milky White",
        currentColor: "White",
        currentColorGroup: "Standard",
        currentDenier: 850,
        currentReedSpace: 54,
        currentBobbinMark: "White Mark",
        currentMesh: "Standard",
        nextQualityCode: "1000D White Standard",
        nextColor: "White",
        nextColorGroup: "Standard",
        nextDenier: 1000,
        nextReedSpace: 56,
        nextBobbinMark: "Double Line",
        nextMesh: "Standard",
        sequence: 1,
        status: "SCHEDULED",
        targetDate: "2026-09-27",
        targetShiftId: "shift_day",
        targetShiftName: "Day Shift",
        remarks: "Reed expansion to 56cm",
        hasChangeover: true,
        isReedSpaceChanged: true,
        isColorChanged: false,
        isBobbinMarkChanged: true,
      },
      {
        id: "loom_2",
        loomNumber: 2,
        currentQuality: "1000D White Standard",
        currentColor: "White",
        currentColorGroup: "Standard",
        currentDenier: 1000,
        currentReedSpace: 56,
        currentBobbinMark: "Standard",
        currentMesh: "Standard",
        nextQualityCode: null,
        nextColor: null,
        nextColorGroup: null,
        nextDenier: null,
        nextReedSpace: null,
        nextBobbinMark: null,
        nextMesh: null,
        sequence: 0,
        status: "PENDING",
        targetDate: null,
        targetShiftId: null,
        targetShiftName: null,
        remarks: null,
        hasChangeover: false,
        isReedSpaceChanged: false,
        isColorChanged: false,
        isBobbinMarkChanged: false,
      },
    ],
    changeoverQueue: [
      {
        id: "loom_1",
        loomNumber: 1,
        currentQuality: "850D Milky White",
        currentColor: "White",
        currentColorGroup: "Standard",
        currentDenier: 850,
        currentReedSpace: 54,
        currentBobbinMark: "White Mark",
        currentMesh: "Standard",
        nextQualityCode: "1000D White Standard",
        nextColor: "White",
        nextColorGroup: "Standard",
        nextDenier: 1000,
        nextReedSpace: 56,
        nextBobbinMark: "Double Line",
        nextMesh: "Standard",
        sequence: 1,
        status: "SCHEDULED",
        targetDate: "2026-09-27",
        targetShiftId: "shift_day",
        targetShiftName: "Day Shift",
        remarks: "Reed expansion to 56cm",
        hasChangeover: true,
        isReedSpaceChanged: true,
        isColorChanged: false,
        isBobbinMarkChanged: true,
      },
    ],
    kpis: {
      totalLooms: 91,
      totalScheduled: 1,
      totalInProgress: 0,
      totalCompleted: 0,
      totalPending: 90,
      totalReedSpaceChanges: 1,
      queueLength: 1,
    },
    selectedStatus: "ALL",
    searchQuery: "",
  };

  it("should export Changeover Excel workbook correctly", () => {
    exportLoomChangeoverExcel(mockChangeoverData);

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const lastCall = calls[calls.length - 1];
    const wb = lastCall[0];
    const filename = lastCall[1];

    expect(filename).toContain("Loom_Changeover_Sheet_");
    expect(wb.SheetNames).toContain("Changeover Queue");
    expect(wb.SheetNames).toContain("1-91 All Looms");
  });

  it("should generate valid Changeover printable HTML with Flexicom logo and signoffs", () => {
    const html = generateLoomChangeoverHtml(mockChangeoverData);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Flexicom Industries Pvt. Ltd.");
    expect(html).toContain("LOOM MACHINE CHANGEOVER & SEQUENCE SCHEDULE");
    expect(html).toContain("logo.png");
    expect(html).toContain("Loom #1");
    expect(html).toContain("850D Milky White");
    expect(html).toContain("1000D White Standard");
    expect(html).toContain("SCHEDULED");
    expect(html).toContain("1. Prepared By (Loom Supervisor)");
    expect(html).toContain("2. Mechanical (Loom Master)");
  });
});
