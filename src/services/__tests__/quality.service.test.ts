import { describe, it, expect, vi, beforeEach } from "vitest";
import { QualityService } from "../quality.service";
import { db } from "../../../test/prisma-mock";
import {
  QcReferenceType,
  QcDecision,
  QcInspectionStatus,
  RollQualityStatus,
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
});
