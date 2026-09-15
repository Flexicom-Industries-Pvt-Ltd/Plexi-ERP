import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDepartment,
  updateDepartment,
  createSection,
  updateSection,
  createLocation,
  updateLocation,
  createMachine,
  updateMachine,
} from "../organization";
import { db } from "../../../test/prisma-mock";
import { LocationType } from "@/generated/prisma";

vi.mock("@/lib/permissions", () => ({
  requirePermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Organization Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Department", () => {
    it("should create a department successfully", async () => {
      const mockDept = { id: "dept-1", name: "Extrusion", code: "EXT", isActive: true };
      vi.mocked(db.department.create).mockResolvedValue(mockDept as any);

      const result = await createDepartment({ name: "Extrusion", code: "EXT" });

      expect(db.department.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "Extrusion", code: "EXT", isActive: true }),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockDept);
      }
    });

    it("should update a department successfully", async () => {
      const mockDept = { id: "dept-1", name: "Extrusion Updated", code: "EXT", isActive: true };
      vi.mocked(db.department.update).mockResolvedValue(mockDept as any);

      const result = await updateDepartment({
        id: "dept-1",
        name: "Extrusion Updated",
        code: "EXT",
        isActive: true,
      });

      expect(db.department.update).toHaveBeenCalledWith({
        where: { id: "dept-1" },
        data: expect.objectContaining({ id: "dept-1", name: "Extrusion Updated", code: "EXT", isActive: true }),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockDept);
      }
    });
  });

  describe("Section", () => {
    it("should create a section successfully", async () => {
      const mockSection = { id: "sec-1", name: "Circular Loom", code: "LOOM", departmentId: "dept-1", isActive: true };
      vi.mocked(db.section.create).mockResolvedValue(mockSection as any);

      const result = await createSection({
        name: "Circular Loom",
        code: "LOOM",
        departmentId: "dept-1",
      });

      expect(db.section.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockSection);
      }
    });

    it("should update a section successfully", async () => {
      const mockSection = { id: "sec-1", name: "Loom Updated", code: "LOOM", departmentId: "dept-1", isActive: true };
      vi.mocked(db.section.update).mockResolvedValue(mockSection as any);

      const result = await updateSection({
        id: "sec-1",
        name: "Loom Updated",
        code: "LOOM",
        departmentId: "dept-1",
      });

      expect(db.section.update).toHaveBeenCalledWith({
        where: { id: "sec-1" },
        data: expect.objectContaining({ id: "sec-1", name: "Loom Updated", code: "LOOM", departmentId: "dept-1" }),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockSection);
      }
    });
  });

  describe("Location", () => {
    it("should create a location successfully", async () => {
      const mockLocation = {
        id: "loc-1",
        name: "Raw Material Warehouse",
        code: "RMW-01",
        type: LocationType.WAREHOUSE,
        isActive: true,
      };
      vi.mocked(db.location.create).mockResolvedValue(mockLocation as any);

      const result = await createLocation({
        name: "Raw Material Warehouse",
        code: "RMW-01",
        type: LocationType.WAREHOUSE,
      });

      expect(db.location.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockLocation);
      }
    });

    it("should update a location successfully", async () => {
      const mockLocation = {
        id: "loc-1",
        name: "FG Warehouse",
        code: "FGW-01",
        type: LocationType.WAREHOUSE,
        isActive: true,
      };
      vi.mocked(db.location.update).mockResolvedValue(mockLocation as any);

      const result = await updateLocation({
        id: "loc-1",
        name: "FG Warehouse",
        code: "FGW-01",
        type: LocationType.WAREHOUSE,
      });

      expect(db.location.update).toHaveBeenCalledWith({
        where: { id: "loc-1" },
        data: expect.objectContaining({ id: "loc-1", name: "FG Warehouse", code: "FGW-01", type: LocationType.WAREHOUSE }),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockLocation);
      }
    });
  });

  describe("Machine", () => {
    it("should create a machine successfully", async () => {
      const mockMachine = {
        id: "m-1",
        name: "Loom Machine #1",
        code: "LM-01",
        sectionId: "sec-1",
        status: "ACTIVE",
        isActive: true,
      };
      vi.mocked(db.machine.create).mockResolvedValue(mockMachine as any);

      const result = await createMachine({
        name: "Loom Machine #1",
        code: "LM-01",
        sectionId: "sec-1",
      });

      expect(db.machine.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockMachine);
      }
    });

    it("should update a machine successfully", async () => {
      const mockMachine = {
        id: "m-1",
        name: "Loom Machine #1 Updated",
        code: "LM-01",
        sectionId: "sec-1",
        status: "ACTIVE",
        isActive: true,
      };
      vi.mocked(db.machine.update).mockResolvedValue(mockMachine as any);

      const result = await updateMachine({
        id: "m-1",
        name: "Loom Machine #1 Updated",
        sectionId: "sec-1",
      });

      expect(db.machine.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: expect.objectContaining({ id: "m-1", name: "Loom Machine #1 Updated", sectionId: "sec-1" }),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockMachine);
      }
    });
  });
});
