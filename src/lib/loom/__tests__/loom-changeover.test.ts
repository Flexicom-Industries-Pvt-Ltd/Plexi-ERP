import { describe, it, expect, vi } from "vitest";
import {
  exportLoomChangeoverExcel,
  LoomChangeoverDataset,
  LoomChangeoverItem,
} from "../loom-changeover-export";
import { generateLoomChangeoverHtml } from "../print-loom-changeover";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<any>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("Loom Changeover Sheet Export & Print Engine", () => {
  const mockLooms: LoomChangeoverItem[] = [
    {
      id: "co_1",
      loomNumber: 6,
      currentQuality: "wOND/LPP/WH/500/67/S1",
      currentColor: "WHITE",
      currentColorGroup: "Yellow",
      currentDenier: 900,
      currentReedSpace: 67.0,
      currentBobbinMark: "RED",
      currentMesh: "10x10",
      nextQualityCode: "AMB/PP/YL/74/500/S1",
      nextColor: "YELLOW",
      nextColorGroup: "Light Green",
      nextDenier: 815,
      nextReedSpace: 74.0,
      nextBobbinMark: "BLUE/BLACK",
      nextMesh: "12x12",
      sequence: 1,
      status: "SCHEDULED",
      targetDate: "2026-09-26",
      targetShiftId: "shift_a",
      targetShiftName: "Shift A",
      remarks: "Full creel cleaning, adjust reed space to 74cm",
      hasChangeover: true,
      isReedSpaceChanged: true,
      isColorChanged: true,
      isBobbinMarkChanged: true,
    },
    {
      id: "co_2",
      loomNumber: 12,
      currentQuality: "wOND/LPP/WH/500/67/S1",
      currentColor: "WHITE",
      currentColorGroup: "Yellow",
      currentDenier: 900,
      currentReedSpace: 67.0,
      currentBobbinMark: "RED",
      currentMesh: "10x10",
      nextQualityCode: "TOP/ALPP/WH/54/500/HC",
      nextColor: "WHITE",
      nextColorGroup: "White",
      nextDenier: 850,
      nextReedSpace: 54.0,
      nextBobbinMark: "BLACK",
      nextMesh: "10x10",
      sequence: 2,
      status: "IN_PROGRESS",
      targetDate: "2026-09-26",
      targetShiftId: "shift_b",
      targetShiftName: "Shift B",
      remarks: "Creel conversion in progress",
      hasChangeover: true,
      isReedSpaceChanged: true,
      isColorChanged: false,
      isBobbinMarkChanged: true,
    },
    {
      id: "co_3",
      loomNumber: 1,
      currentQuality: "TOP/PP/WH/500/76/HC",
      currentColor: "WHITE",
      currentColorGroup: "Light Blue",
      currentDenier: 830,
      currentReedSpace: 76.0,
      currentBobbinMark: "RED/BLUE",
      currentMesh: "10x10",
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
  ];

  const mockDataset: LoomChangeoverDataset = {
    looms: mockLooms,
    allLooms: mockLooms,
    changeoverQueue: [mockLooms[0], mockLooms[1]],
    kpis: {
      totalLooms: 91,
      totalScheduled: 1,
      totalInProgress: 1,
      totalCompleted: 0,
      totalPending: 89,
      totalReedSpaceChanges: 2,
      queueLength: 2,
    },
    selectedStatus: "ALL",
  };

  describe("Excel Export Functionality", () => {
    it("should generate Excel workbook with 4 sheets and trigger download", () => {
      exportLoomChangeoverExcel(mockDataset);

      expect(XLSX.writeFile).toHaveBeenCalled();
      const calls = (XLSX.writeFile as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const [wb, filename] = calls[calls.length - 1];
      expect(filename).toContain("Flexicom_Loom_Changeover_Sheet_");
      expect(filename).toContain(".xlsx");

      expect(wb.SheetNames).toEqual([
        "Changeover Queue",
        "1-91 All Looms",
        "Mechanical Reed Diff",
        "KPI Summary",
      ]);
    });

    it("should include correct headers and priority queue items in Sheet 1", () => {
      exportLoomChangeoverExcel(mockDataset);
      const [wb] = (XLSX.writeFile as any).mock.calls.slice(-1)[0];
      const sheet = wb.Sheets["Changeover Queue"];
      expect(sheet).toBeDefined();

      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      expect(json[0][0]).toContain("FLEXICOM INDUSTRIES PVT. LTD. - CIRCULAR LOOMS CHANGEOVER EXECUTION QUEUE");
    });
  });

  describe("HTML Print & PDF Schedule Engine", () => {
    it("should generate valid printable HTML containing company header, sequence queue, and KPIs", () => {
      const html = generateLoomChangeoverHtml(mockDataset);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Flexicom Industries Pvt. Ltd.");
      expect(html).toContain("Loom Section — Machine Changeover Sheet & Sequence Schedule");
      expect(html).toContain("LM-CO-");

      // Check KPI values
      expect(html).toContain("Total Installed Looms");
      expect(html).toContain("91");
      expect(html).toContain("Scheduled Changeovers");

      // Check Loom rows and specs
      expect(html).toContain("Loom #6");
      expect(html).toContain("wOND/LPP/WH/500/67/S1");
      expect(html).toContain("AMB/PP/YL/74/500/S1");
      expect(html).toContain("(Diff: +7cm)");
      expect(html).toContain("(Diff: -13cm)");
      expect(html).toContain("Loom #12");
      expect(html).toContain("TOP/ALPP/WH/54/500/HC");

      // Check supervisor sign-off boxes
      expect(html).toContain("1. Prepared By (Loom Supervisor)");
      expect(html).toContain("2. Loom Master (Mechanical)");
      expect(html).toContain("3. Quality Inspector (QC Passed)");
      expect(html).toContain("4. Factory Production Head");
    });

    it("should render empty state message if no changeovers are queued", () => {
      const emptyDataset: LoomChangeoverDataset = {
        looms: [mockLooms[2]],
        allLooms: [mockLooms[2]],
        changeoverQueue: [],
        kpis: {
          totalLooms: 91,
          totalScheduled: 0,
          totalInProgress: 0,
          totalCompleted: 0,
          totalPending: 91,
          totalReedSpaceChanges: 0,
          queueLength: 0,
        },
      };

      const html = generateLoomChangeoverHtml(emptyDataset);
      expect(html).toContain("No active changeovers currently queued");
    });
  });

  describe("Changeover Logic & Diff Computation", () => {
    it("should correctly identify reed space changes when next reed differs from current reed", () => {
      const itemWithDiff = mockLooms[0];
      expect(itemWithDiff.isReedSpaceChanged).toBe(true);
      expect(itemWithDiff.currentReedSpace).toBe(67.0);
      expect(itemWithDiff.nextReedSpace).toBe(74.0);

      const itemWithoutChange = mockLooms[2];
      expect(itemWithoutChange.isReedSpaceChanged).toBe(false);
    });

    it("should correctly sort changeover queue with active sequence first", () => {
      const items = [...mockLooms].sort((a, b) => {
        if (a.sequence > 0 && b.sequence > 0) return a.sequence - b.sequence;
        if (a.sequence > 0) return -1;
        if (b.sequence > 0) return 1;
        return a.loomNumber - b.loomNumber;
      });

      expect(items[0].loomNumber).toBe(6);
      expect(items[0].sequence).toBe(1);
      expect(items[1].loomNumber).toBe(12);
      expect(items[1].sequence).toBe(2);
      expect(items[2].loomNumber).toBe(1);
      expect(items[2].sequence).toBe(0);
    });
  });
});
