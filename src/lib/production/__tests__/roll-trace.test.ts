import { describe, it, expect, vi, beforeEach } from "vitest";
import { traceRollByNumber, listRecentRolls } from "../roll-trace";
import { db } from "../../../../test/prisma-mock";

describe("Roll Tracing & Genealogy Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not found when roll number has no matching records", async () => {
    vi.mocked(db.loomRollCuttingEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.laminationProductionEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.printingDailyReportEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.convertexDailyReportEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.valvomaticDailyReportEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.productionRoll.findFirst).mockResolvedValue(null);

    const result = await traceRollByNumber("UNKNOWN-999");
    expect(result.found).toBe(false);
    expect(result.rollNumber).toBe("UNKNOWN-999");
    expect(result.currentStage).toBe("UNKNOWN");
    expect(result.timeline).toHaveLength(0);
  });

  it("should identify fresh cut roll at Loom stage with scale weights and operator details", async () => {
    const mockLoomEntry = {
      id: "loom-cut-1",
      rollNumber: "CT-14376",
      loomNumber: 4,
      sequence: 1,
      size: "490",
      qualityType: "Mahal/LPP/W",
      initialReading: 100,
      finalReading: 1300,
      meter: 1200,
      grossWeightKg: 86.4,
      tareWeightKg: 1.2,
      nettWeightKg: 85.2,
      avgWeightPerMeter: 71.0,
      supervisorSign: "R. Sharma",
      contractor: "Balaji Enterprises",
      photoUrl: "https://storage.flexicom.com/photos/roll-scale-1.jpg",
      remarks: "Clean cut",
      createdAt: new Date("2026-11-20T10:00:00Z"),
      report: {
        date: "2026-11-20",
        shiftName: "DAY",
        supervisorName: "R. Sharma",
      },
    };

    vi.mocked(db.loomRollCuttingEntry.findFirst).mockResolvedValue(mockLoomEntry as any);
    vi.mocked(db.laminationProductionEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.printingDailyReportEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.convertexDailyReportEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.valvomaticDailyReportEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.productionRoll.findFirst).mockResolvedValue(null);

    const result = await traceRollByNumber("CT-14376");

    expect(result.found).toBe(true);
    expect(result.rollNumber).toBe("CT-14376");
    expect(result.currentStage).toBe("LOOM");
    expect(result.currentStageLabel).toContain("Loom Roll");
    expect(result.specs.qualityType).toBe("Mahal/LPP/W");
    expect(result.specs.widthMm).toBe("490");
    expect(result.specs.initialNettWeightKg).toBe(85.2);
    expect(result.specs.initialMeters).toBe(1200);

    expect(result.stages.loom).toBeDefined();
    expect(result.stages.loom?.loomNumber).toBe(4);
    expect(result.stages.loom?.nettWeightKg).toBe(85.2);
    expect(result.stages.loom?.photoUrl).toBe("https://storage.flexicom.com/photos/roll-scale-1.jpg");

    expect(result.timeline).toHaveLength(4);
    expect(result.timeline[0].status).toBe("COMPLETED");
    expect(result.timeline[1].status).toBe("PENDING");
  });

  it("should trace full lifecycle from Loom -> Lamination -> Printing -> Convertex", async () => {
    const mockLoom = {
      id: "loom-1",
      rollNumber: "DI13614",
      loomNumber: 42,
      sequence: 3,
      size: "500",
      qualityType: "Ambuja PPC",
      meter: 2000,
      nettWeightKg: 140,
      avgWeightPerMeter: 70,
      createdAt: new Date("2026-11-18T08:00:00Z"),
      report: { date: "2026-11-18", shiftName: "DAY", supervisorName: "A. Singh" },
    };

    const mockLam = {
      id: "lam-1",
      rollNumber: "DI13614",
      quality: "Ambuja PPC Lam",
      size: "500",
      loomNumber: 42,
      rollMeter: 2000,
      netWeightBefore: 140,
      avgWeightBefore: 70,
      productionMeter: 2000,
      netWeightAfter: 168,
      avgWeightAfter: 84,
      coating: 14,
      createdAt: new Date("2026-11-19T09:00:00Z"),
      report: { date: "2026-11-19", shiftName: "DAY", supervisorName: "M. Kumar" },
    };

    const mockPrint = {
      id: "print-1",
      rollNumber: "DI13614",
      companyName: "Ambuja",
      unitName: "Ropar",
      grade: "PPC",
      quality: "Ambuja PPC",
      loomNumber: "42",
      drumSize: "380mm",
      productionMeter: 2000,
      netWeight: 168,
      avgWeight: 84,
      printMeter: 2000,
      createdAt: new Date("2026-11-20T11:00:00Z"),
      report: { date: "2026-11-20", shiftName: "NIGHT", supervisorName: "P. Verma" },
    };

    const mockConvertex = {
      id: "conv-1",
      rollNumber: "DI13614",
      companyName: "Ambuja",
      unitName: "Ropar",
      grade: "PPC",
      quality: "Ambuja PPC",
      productionPcs: 3800,
      productionKg: 162,
      loomFabricWasteKg: 1.2,
      lamFabricWasteKg: 2.1,
      printFabricWasteKg: 1.5,
      createdAt: new Date("2026-11-21T14:00:00Z"),
      report: { date: "2026-11-21", shiftName: "DAY", supervisorName: "S. Yadav" },
    };

    vi.mocked(db.loomRollCuttingEntry.findFirst).mockResolvedValue(mockLoom as any);
    vi.mocked(db.laminationProductionEntry.findFirst).mockResolvedValue(mockLam as any);
    vi.mocked(db.printingDailyReportEntry.findFirst).mockResolvedValue(mockPrint as any);
    vi.mocked(db.convertexDailyReportEntry.findFirst).mockResolvedValue(mockConvertex as any);
    vi.mocked(db.valvomaticDailyReportEntry.findFirst).mockResolvedValue(null);
    vi.mocked(db.productionRoll.findFirst).mockResolvedValue(null);

    const result = await traceRollByNumber("DI13614");

    expect(result.found).toBe(true);
    expect(result.currentStage).toBe("CONVERTEX");
    expect(result.currentStageLabel).toBe("Converted to Bags");

    expect(result.stages.loom?.loomNumber).toBe(42);
    expect(result.stages.lamination?.coating).toBe(14);
    expect(result.stages.printing?.companyName).toBe("Ambuja");
    expect(result.stages.conversion?.productionPcs).toBe(3800);

    // All timeline stages should be marked completed
    expect(result.timeline.every((t) => t.status === "COMPLETED")).toBe(true);
  });

  it("should list recent rolls for quick selection", async () => {
    const mockList = [
      {
        id: "r1",
        rollNumber: "CT-14376",
        loomNumber: 4,
        size: "490",
        qualityType: "Mahal/LPP/W",
        meter: 1200,
        nettWeightKg: 85.2,
        supervisorSign: "R. Sharma",
        photoUrl: "https://photo.url",
        createdAt: new Date("2026-11-22T08:00:00Z"),
        report: { date: "2026-11-22", shiftName: "DAY", supervisorName: "R. Sharma" },
      },
    ];

    vi.mocked(db.loomRollCuttingEntry.findMany).mockResolvedValue(mockList as any);

    const list = await listRecentRolls(10);
    expect(list).toHaveLength(1);
    expect(list[0].rollNumber).toBe("CT-14376");
    expect(list[0].hasPhoto).toBe(true);
  });
});
