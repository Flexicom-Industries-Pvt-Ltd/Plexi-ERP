import { describe, it, expect, vi, beforeEach } from "vitest";
import { QualityService } from "../quality.service";
import { db } from "../../../test/prisma-mock";
import {
  QcReferenceType,
  QcDecision,
  QcInspectionStatus,
  RollQualityStatus,
  QcReworkStatus,
} from "@/generated/prisma";


describe("QualityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateInspectionNumber", () => {
    it("should generate initial sequence number if no previous inspection exists today", async () => {
      vi.mocked(db.qcInspection.findFirst).mockResolvedValue(null);

      const num = await QualityService.generateInspectionNumber();

      expect(num).toMatch(/^QC-\d{8}-0001$/);
    });

    it("should increment sequence number from latest inspection", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      vi.mocked(db.qcInspection.findFirst).mockResolvedValue({
        inspectionNumber: `QC-${today}-0042`,
      } as any);

      const num = await QualityService.generateInspectionNumber();

      expect(num).toBe(`QC-${today}-0043`);
    });
  });

  describe("listInspections", () => {
    it("should fetch inspection list with default parameters", async () => {
      const mockInspections = [
        {
          id: "qc-1",
          inspectionNumber: "QC-20260915-0001",
          referenceType: QcReferenceType.ROLL,
          referenceId: "roll-1",
          status: QcInspectionStatus.PENDING,
          lines: [],
        },
      ];

      vi.mocked(db.qcInspection.findMany).mockResolvedValue(mockInspections as any);
      vi.mocked(db.qcInspection.count).mockResolvedValue(1);

      const result = await QualityService.listInspections();

      expect(result.inspections).toHaveLength(1);
      expect(result.inspections[0].inspectionNumber).toBe("QC-20260915-0001");
      expect(db.qcInspection.findMany).toHaveBeenCalled();
    });

    it("should apply filters and return pagination metadata", async () => {
      vi.mocked(db.qcInspection.findMany).mockResolvedValue([]);
      vi.mocked(db.qcInspection.count).mockResolvedValue(30);

      const result = await QualityService.listInspections(
        {
          referenceType: QcReferenceType.ROLL,
          decision: QcDecision.PASSED,
          search: "QC-2026",
          page: 2,
          limit: 10,
        },
        { paginate: true }
      );

      expect(db.qcInspection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            referenceType: QcReferenceType.ROLL,
            decision: QcDecision.PASSED,
            OR: expect.any(Array),
          }),
        })
      );
      expect(result.meta).toBeDefined();
      expect(result.meta?.page).toBe(2);
      expect(result.meta?.total).toBe(30);
      expect(result.meta?.totalPages).toBe(3);
    });
  });

  describe("getInspectionById", () => {
    it("should return inspection along with resolved target details", async () => {
      const mockInspection = {
        id: "qc-1",
        inspectionNumber: "QC-20260915-0001",
        referenceType: QcReferenceType.ROLL,
        referenceId: "roll-1",
        status: QcInspectionStatus.COMPLETED,
        decision: QcDecision.PASSED,
        lines: [],
      };

      const mockRoll = {
        id: "roll-1",
        rollNumber: "R-100",
        weight: 120.5,
      };

      vi.mocked(db.qcInspection.findUnique).mockResolvedValue(mockInspection as any);
      vi.mocked(db.productionRoll.findUnique).mockResolvedValue(mockRoll as any);

      const result = await QualityService.getInspectionById("qc-1");

      expect(result).not.toBeNull();
      expect(result?.inspectionNumber).toBe("QC-20260915-0001");
      expect(result?.target).toEqual(mockRoll);
    });

    it("should return null if inspection not found", async () => {
      vi.mocked(db.qcInspection.findUnique).mockResolvedValue(null);

      const result = await QualityService.getInspectionById("missing");
      expect(result).toBeNull();
    });
  });

  describe("createInspection", () => {
    it("should create inspection record with generated sequence and lines", async () => {
      vi.mocked(db.qcInspection.findFirst).mockResolvedValue(null);
      const mockCreated = {
        id: "qc-new",
        inspectionNumber: "QC-20260915-0001",
        referenceType: QcReferenceType.ROLL,
        referenceId: "roll-1",
        status: QcInspectionStatus.PENDING,
        lines: [
          { parameterName: "GSM", standardValue: "100", actualValue: "98", status: QcDecision.PASSED },
        ],
      };
      vi.mocked(db.qcInspection.create).mockResolvedValue(mockCreated as any);

      const result = await QualityService.createInspection({
        referenceType: QcReferenceType.ROLL,
        referenceId: "roll-1",
        inspectorId: "u-inspector",
        notes: "Initial roll test",
        lines: [
          { parameterName: "GSM", standardValue: "100", actualValue: "98", status: QcDecision.PASSED },
        ],
      });

      expect(result.id).toBe("qc-new");
      expect(db.qcInspection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            referenceType: QcReferenceType.ROLL,
            referenceId: "roll-1",
            inspectorId: "u-inspector",
            status: QcInspectionStatus.PENDING,
          }),
        })
      );
    });
  });

  describe("recordDecision", () => {
    it("should record decision, complete inspection, and sync Roll qualityStatus to PASSED", async () => {
      const existing = {
        id: "qc-1",
        referenceType: QcReferenceType.ROLL,
        referenceId: "roll-1",
        status: QcInspectionStatus.PENDING,
      };
      vi.mocked(db.qcInspection.findUnique).mockResolvedValue(existing as any);

      const updatedInspection = {
        id: "qc-1",
        decision: QcDecision.PASSED,
        status: QcInspectionStatus.COMPLETED,
        lines: [],
      };
      vi.mocked(db.qcInspection.update).mockResolvedValue(updatedInspection as any);
      vi.mocked(db.productionRoll.updateMany).mockResolvedValue({ count: 1 });

      const result = await QualityService.recordDecision("qc-1", {
        decision: QcDecision.PASSED,
        notes: "Passed all specs",
      });

      expect(result.decision).toBe(QcDecision.PASSED);
      expect(db.qcInspection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "qc-1" },
          data: expect.objectContaining({
            decision: QcDecision.PASSED,
            status: QcInspectionStatus.COMPLETED,
          }),
        })
      );
      expect(db.productionRoll.updateMany).toHaveBeenCalledWith({
        where: { id: "roll-1" },
        data: { qualityStatus: RollQualityStatus.PASSED },
      });
    });

    it("should sync Bale qualityStatus to FAILED when decision is FAILED", async () => {
      const existing = {
        id: "qc-2",
        referenceType: QcReferenceType.BALE,
        referenceId: "bale-1",
        status: QcInspectionStatus.PENDING,
      };
      vi.mocked(db.qcInspection.findUnique).mockResolvedValue(existing as any);

      const updatedInspection = {
        id: "qc-2",
        decision: QcDecision.FAILED,
        status: QcInspectionStatus.COMPLETED,
        defectReason: "Stitching tear",
      };
      vi.mocked(db.qcInspection.update).mockResolvedValue(updatedInspection as any);
      vi.mocked(db.bale.updateMany).mockResolvedValue({ count: 1 });

      const result = await QualityService.recordDecision("qc-2", {
        decision: QcDecision.FAILED,
        defectReason: "Stitching tear",
      });

      expect(result.decision).toBe(QcDecision.FAILED);
      expect(db.bale.updateMany).toHaveBeenCalledWith({
        where: { id: "bale-1" },
        data: { qualityStatus: RollQualityStatus.FAILED },
      });
    });

    it("should throw error if inspection record not found", async () => {
      vi.mocked(db.qcInspection.findUnique).mockResolvedValue(null);

      await expect(
        QualityService.recordDecision("missing", { decision: QcDecision.PASSED })
      ).rejects.toThrow("QC inspection record not found.");
    });
  });

  describe("getInspectionQueue", () => {
    it("should fetch queue items and calculate KPI metrics", async () => {
      vi.mocked(db.productionRoll.count).mockResolvedValueOnce(5); // pendingRolls
      vi.mocked(db.bale.count).mockResolvedValueOnce(3); // pendingBales
      vi.mocked(db.productionRoll.count).mockResolvedValueOnce(1); // onHoldRolls
      vi.mocked(db.bale.count).mockResolvedValueOnce(0); // onHoldBales
      vi.mocked(db.productionRoll.count).mockResolvedValueOnce(2); // reworkRolls
      vi.mocked(db.bale.count).mockResolvedValueOnce(1); // reworkBales
      vi.mocked(db.qcInspection.count).mockResolvedValueOnce(10); // inspectedToday
      vi.mocked(db.qcInspection.count).mockResolvedValueOnce(8); // passedToday
      vi.mocked(db.qcInspection.count).mockResolvedValueOnce(1); // failedToday
      vi.mocked(db.qcInspection.count).mockResolvedValueOnce(1); // reworkToday
      vi.mocked(db.qcInspection.count).mockResolvedValueOnce(0); // onHoldToday

      vi.mocked(db.productionRoll.findMany).mockResolvedValue([
        {
          id: "roll-1",
          rollNumber: "R-101",
          rollType: "PP_WOVEN",
          sourcePhase: "LOOM",
          qualityStatus: RollQualityStatus.PENDING_QC,
          weight: 120,
          length: 500,
          inventoryItem: { code: "ITEM-1", name: "PP Fabric" },
          createdAt: new Date("2026-09-15T09:00:00Z"),
        },
      ] as any);

      vi.mocked(db.bale.findMany).mockResolvedValue([
        {
          id: "bale-1",
          baleNumber: "B-201",
          bagsPerBale: 500,
          quantity: 500,
          qualityStatus: RollQualityStatus.PENDING_QC,
          product: { code: "BAG-1", name: "PP Bag 50kg" },
          shift: { name: "Morning Shift" },
          createdAt: new Date("2026-09-15T08:00:00Z"),
        },
      ] as any);

      const result = await QualityService.getInspectionQueue();

      expect(result.stats.pendingCount).toBe(8);
      expect(result.stats.onHoldCount).toBe(1);
      expect(result.stats.reworkCount).toBe(3);
      expect(result.stats.inspectedToday).toBe(10);
      expect(result.stats.passedToday).toBe(8);
      expect(result.stats.passRate).toBe(80);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].identifier).toBe("R-101");
      expect(result.items[1].identifier).toBe("B-201");
    });

    it("should filter queue items by referenceType = ROLL", async () => {
      vi.mocked(db.productionRoll.count).mockResolvedValue(0);
      vi.mocked(db.bale.count).mockResolvedValue(0);
      vi.mocked(db.qcInspection.count).mockResolvedValue(0);

      vi.mocked(db.productionRoll.findMany).mockResolvedValue([
        {
          id: "roll-2",
          rollNumber: "R-102",
          rollType: "PP_WOVEN",
          sourcePhase: "LOOM",
          qualityStatus: RollQualityStatus.PENDING_QC,
          createdAt: new Date(),
        },
      ] as any);

      const result = await QualityService.getInspectionQueue({
        referenceType: QcReferenceType.ROLL,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].referenceType).toBe("ROLL");
      expect(db.bale.findMany).not.toHaveBeenCalled();
    });
  });

  describe("generateReworkTicketNumber", () => {
    it("should generate initial rework ticket number if none exists today", async () => {
      vi.mocked(db.qcReworkTicket.findFirst).mockResolvedValue(null);

      const num = await QualityService.generateReworkTicketNumber();

      expect(num).toMatch(/^RW-\d{8}-0001$/);
    });

    it("should increment sequence number from latest ticket", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      vi.mocked(db.qcReworkTicket.findFirst).mockResolvedValue({
        ticketNumber: `RW-${today}-0007`,
      } as any);

      const num = await QualityService.generateReworkTicketNumber();

      expect(num).toBe(`RW-${today}-0008`);
    });
  });

  describe("createReworkTicket", () => {
    it("should create a rework ticket and update source roll qualityStatus to REWORK", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      vi.mocked(db.qcReworkTicket.findFirst).mockResolvedValue(null);
      vi.mocked(db.qcReworkTicket.create).mockResolvedValue({
        id: "rw-1",
        ticketNumber: `RW-${today}-0001`,
        sourceReferenceType: QcReferenceType.ROLL,
        sourceReferenceId: "roll-1",
        targetPhase: "LOOM",
        status: QcReworkStatus.OPEN,
      } as any);
      vi.mocked(db.productionRoll.updateMany).mockResolvedValue({ count: 1 });

      const ticket = await QualityService.createReworkTicket({
        sourceReferenceType: QcReferenceType.ROLL,
        sourceReferenceId: "roll-1",
        targetPhase: "LOOM",
        defectReason: "Weave gap",
        reworkInstructions: "Re-thread harness",
      });

      expect(ticket.id).toBe("rw-1");
      expect(ticket.ticketNumber).toBe(`RW-${today}-0001`);
      expect(db.productionRoll.updateMany).toHaveBeenCalledWith({
        where: { id: "roll-1" },
        data: { qualityStatus: RollQualityStatus.REWORK },
      });
    });
  });

  describe("updateReworkTicket", () => {
    it("should update ticket and auto-reset roll qualityStatus to PENDING_QC when completed", async () => {
      vi.mocked(db.qcReworkTicket.findUnique).mockResolvedValue({
        id: "rw-1",
        sourceReferenceType: QcReferenceType.ROLL,
        sourceReferenceId: "roll-1",
        status: QcReworkStatus.IN_PROGRESS,
      } as any);

      vi.mocked(db.qcReworkTicket.update).mockResolvedValue({
        id: "rw-1",
        status: QcReworkStatus.COMPLETED,
        notes: "Re-threaded successfully",
      } as any);

      vi.mocked(db.productionRoll.updateMany).mockResolvedValue({ count: 1 });

      const updated = await QualityService.updateReworkTicket("rw-1", {
        status: QcReworkStatus.COMPLETED,
        notes: "Re-threaded successfully",
      });

      expect(updated.status).toBe(QcReworkStatus.COMPLETED);
      expect(db.productionRoll.updateMany).toHaveBeenCalledWith({
        where: { id: "roll-1" },
        data: { qualityStatus: RollQualityStatus.PENDING_QC },
      });
    });
  });
});


