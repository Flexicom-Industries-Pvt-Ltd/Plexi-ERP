import { describe, it, expect, vi } from "vitest";
import {
  exportLoomSummaryExcel,
  LoomSummaryDataset,
} from "../loom-summary-export";
import { generateLoomSummaryHtml } from "../print-loom-summary";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<any>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("Loom Summary Export & Print Engine", () => {
  const mockDataset: LoomSummaryDataset = {
    qualities: [
      {
        id: "q-1",
        qualityCode: "wOND/LPP/WH/500/67/S1",
        colorGroup: "White",
        colour: "WHITE",
        denier: 840,
        tapeWidth: 2.5,
        bobbinMarking: "RED",
        reedSpaceCm: 67,
        mesh: "10x10",
        targetPpm: 850,
        remarks: null,
        loomNumbers: [6, 7, 8, 9, 10],
        totalLooms: 5,
        status: "RUNNING",
        lastRunDate: "2026-09-24",
        latestOperator: "Rajesh Kumar",
        activeShifts: ["Shift A"],
        plannedOutputKg: 1200,
        actualOutputKg: 1180,
      },
      {
        id: "q-2",
        qualityCode: "AMB/PP/YL/74/500/S1",
        colorGroup: "Yellow",
        colour: "YELLOW",
        denier: 900,
        tapeWidth: 3.0,
        bobbinMarking: "BLACK",
        reedSpaceCm: 50,
        mesh: "12x12",
        targetPpm: 900,
        remarks: null,
        loomNumbers: [1, 2, 3, 4, 5],
        totalLooms: 5,
        status: "PLANNED",
        lastRunDate: "2026-09-24",
        latestOperator: null,
        activeShifts: ["Shift B"],
        plannedOutputKg: 800,
        actualOutputKg: 0,
      },
    ],
    loomMatrix: [
      {
        loomNumber: 1,
        isAllocated: true,
        qualityId: "q-2",
        qualityCode: "AMB/PP/YL/74/500/S1",
        colorGroup: "Yellow",
        colour: "YELLOW",
        denier: 900,
        tapeWidth: 3.0,
        reedSpaceCm: 50,
        bobbinMarking: "BLACK",
        status: "PLANNED",
      },
      {
        loomNumber: 6,
        isAllocated: true,
        qualityId: "q-1",
        qualityCode: "wOND/LPP/WH/500/67/S1",
        colorGroup: "White",
        colour: "WHITE",
        denier: 840,
        tapeWidth: 2.5,
        reedSpaceCm: 67,
        bobbinMarking: "RED",
        status: "RUNNING",
      },
    ],
    kpis: {
      totalFactoryLooms: 91,
      totalAllocatedLooms: 10,
      totalRunningLooms: 5,
      totalPlannedLooms: 5,
      totalStandbyLooms: 0,
      totalUnallocatedLooms: 81,
      runningQualitiesCount: 1,
      plannedQualitiesCount: 1,
      totalQualitiesCount: 2,
      totalTapePlannedKg: 2000,
      totalTapeProducedKg: 1180,
    },
    colorGroupsSummary: [
      {
        colorGroup: "White",
        totalLooms: 5,
        qualityCount: 1,
        activeLooms: 5,
      },
      {
        colorGroup: "Yellow",
        totalLooms: 5,
        qualityCount: 1,
        activeLooms: 0,
      },
    ],
    shiftSummaryList: [
      {
        shiftId: "s-1",
        shiftName: "Shift A",
        startTime: "06:00",
        endTime: "14:00",
        qualitiesCount: 1,
        activeLoomsCount: 5,
        producedKg: 1180,
        plannedKg: 1200,
        operators: ["Rajesh Kumar"],
        qualityCodes: ["wOND/LPP/WH/500/67/S1"],
      },
      {
        shiftId: "s-2",
        shiftName: "Shift B",
        startTime: "14:00",
        endTime: "22:00",
        qualitiesCount: 1,
        activeLoomsCount: 5,
        producedKg: 0,
        plannedKg: 800,
        operators: [],
        qualityCodes: ["AMB/PP/YL/74/500/S1"],
      },
    ],
    selectedDate: "2026-09-24",
    selectedShiftName: "Shift A",
  };

  it("should export full multi-sheet Excel workbook with Shift Operations for Loom Summary", () => {
    exportLoomSummaryExcel(mockDataset);

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const lastCall = calls[calls.length - 1];
    const wb = lastCall[0];
    const filename = lastCall[1];

    expect(filename).toContain("Loom_Summary_Allocations_2026-09-24.xlsx");
    expect(wb.SheetNames).toContain("Loom Allocations");
    expect(wb.SheetNames).toContain("1-91 Loom Matrix");
    expect(wb.SheetNames).toContain("Shift Operations");
    expect(wb.SheetNames).toContain("KPI Scorecard");
  });

  it("should generate valid A4 landscape printable HTML document with Date and Shift context", () => {
    const html = generateLoomSummaryHtml(mockDataset);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Flexicom Industries Pvt. Ltd.");
    expect(html).toContain("Loom Machine Master Allocations & Running Qualities");
    expect(html).toContain("Date: <strong>2026-09-24</strong>");
    expect(html).toContain("Shift: <strong>Shift A</strong>");
    expect(html).toContain("size: A4 landscape;");
    expect(html).toContain("margin: 8mm;");
    expect(html).toContain("wOND/LPP/WH/500/67/S1");
    expect(html).toContain("AMB/PP/YL/74/500/S1");
    expect(html).toContain("RUNNING IN TAPE");
    expect(html).toContain("PLANNED IN TAPE");
    expect(html).toContain("#6, #7, #8, #9, #10");
    expect(html).toContain("Shift-Wise Tape Output & Active Loom Machine Deployments");
  });

  it("should render 3 official sign-offs on printed audit sheet", () => {
    const html = generateLoomSummaryHtml(mockDataset);

    expect(html).toContain("Prepared By (Loom Section Master)");
    expect(html).toContain("Verified By (Tape Plant In-Charge)");
    expect(html).toContain("Approved By (Plant Supervisor / GM)");
  });
});

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { requireLoomApiPermission } from "../permissions";
import { auth } from "@/auth";

describe("Loom RBAC Permission Guard", () => {
  it("should deny access when user is not logged in", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any);
    const result = await requireLoomApiPermission("canRead");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it("should deny access when user has PRODUCTION permission but NOT LOOM permission", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "u-1",
        role: "Operator",
        permissions: [
          { module: "PRODUCTION", canRead: true },
          { module: "TAPE_PLANT", canRead: true },
        ],
      },
    } as any);

    const result = await requireLoomApiPermission("canRead");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("should grant access when user has explicit LOOM permission", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "u-2",
        role: "Loom Master",
        permissions: [{ module: "LOOM", canRead: true }],
      },
    } as any);

    const result = await requireLoomApiPermission("canRead");
    expect(result.ok).toBe(true);
  });

  it("should grant access when user has Super Admin role", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "u-3",
        role: "Super Admin",
        permissions: [],
      },
    } as any);

    const result = await requireLoomApiPermission("canRead");
    expect(result.ok).toBe(true);
  });
});

