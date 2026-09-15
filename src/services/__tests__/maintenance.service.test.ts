import { describe, it, expect, vi, beforeEach } from "vitest";
import { MaintenanceService } from "../maintenance.service";
import { db } from "../../../test/prisma-mock";
import {
  MaintenanceType,
  MaintenanceStatus,
  MaintenancePriority,
} from "@/generated/prisma";

describe("MaintenanceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateLogNumber", () => {
    it("should generate initial sequence number if no previous log exists today", async () => {
      vi.mocked(db.maintenanceLog.findFirst).mockResolvedValue(null);

      const num = await MaintenanceService.generateLogNumber();

      expect(num).toMatch(/^MNT-\d{8}-0001$/);
    });

    it("should increment sequence number from latest log", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      vi.mocked(db.maintenanceLog.findFirst).mockResolvedValue({
        logNumber: `MNT-${today}-0005`,
      } as any);

      const num = await MaintenanceService.generateLogNumber();

      expect(num).toBe(`MNT-${today}-0006`);
    });
  });

  describe("listMaintenanceLogs", () => {
    it("should fetch maintenance logs with default query", async () => {
      const mockLogs = [
        {
          id: "mnt-1",
          logNumber: "MNT-20260915-0001",
          machineId: "mach-1",
          title: "Loom bearing noise",
          type: MaintenanceType.BREAKDOWN,
          status: MaintenanceStatus.OPEN,
        },
      ];

      vi.mocked(db.maintenanceLog.findMany).mockResolvedValue(mockLogs as any);
      vi.mocked(db.maintenanceLog.count).mockResolvedValue(1);

      const result = await MaintenanceService.listMaintenanceLogs();

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].logNumber).toBe("MNT-20260915-0001");
      expect(db.maintenanceLog.findMany).toHaveBeenCalled();
    });

    it("should apply filters and return pagination metadata", async () => {
      vi.mocked(db.maintenanceLog.findMany).mockResolvedValue([]);
      vi.mocked(db.maintenanceLog.count).mockResolvedValue(35);

      const result = await MaintenanceService.listMaintenanceLogs(
        {
          machineId: "mach-2",
          status: MaintenanceStatus.OPEN,
          priority: MaintenancePriority.CRITICAL,
          search: "motor",
          page: 2,
          limit: 10,
        },
        { paginate: true }
      );

      expect(db.maintenanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            machineId: "mach-2",
            status: MaintenanceStatus.OPEN,
            priority: MaintenancePriority.CRITICAL,
            OR: expect.any(Array),
          }),
        })
      );
      expect(result.meta).toBeDefined();
      expect(result.meta?.page).toBe(2);
      expect(result.meta?.total).toBe(35);
      expect(result.meta?.totalPages).toBe(4);
    });
  });

  describe("getMaintenanceLogById", () => {
    it("should retrieve single maintenance log by ID", async () => {
      const mockLog = {
        id: "mnt-10",
        logNumber: "MNT-20260915-0010",
        title: "Extruder heater band replacement",
      };

      vi.mocked(db.maintenanceLog.findUnique).mockResolvedValue(mockLog as any);

      const result = await MaintenanceService.getMaintenanceLogById("mnt-10");

      expect(result).toEqual(mockLog);
      expect(db.maintenanceLog.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "mnt-10" },
        })
      );
    });
  });

  describe("createMaintenanceLog", () => {
    it("should create maintenance log and update machine status to MAINTENANCE on breakdown", async () => {
      vi.mocked(db.maintenanceLog.findFirst).mockResolvedValue(null);

      const mockCreatedLog = {
        id: "mnt-1",
        logNumber: "MNT-20260915-0001",
        machineId: "mach-1",
        type: MaintenanceType.BREAKDOWN,
        status: MaintenanceStatus.OPEN,
      };

      vi.mocked(db.maintenanceLog.create).mockResolvedValue(mockCreatedLog as any);
      vi.mocked(db.machine.update).mockResolvedValue({ id: "mach-1", status: "MAINTENANCE" } as any);

      const result = await MaintenanceService.createMaintenanceLog(
        {
          machineId: "mach-1",
          type: MaintenanceType.BREAKDOWN,
          priority: MaintenancePriority.HIGH,
          title: "Main motor overheating",
          description: "Thermal overload tripped during extrusion run",
          downtimeMinutes: 45,
        },
        "user-reporter"
      );

      expect(result).toEqual(mockCreatedLog);
      expect(db.maintenanceLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            machineId: "mach-1",
            type: MaintenanceType.BREAKDOWN,
            status: MaintenanceStatus.OPEN,
            reportedById: "user-reporter",
          }),
        })
      );
      expect(db.machine.update).toHaveBeenCalledWith({
        where: { id: "mach-1" },
        data: { status: "MAINTENANCE" },
      });
    });
  });

  describe("updateMaintenanceLog", () => {
    it("should throw error if log not found", async () => {
      vi.mocked(db.maintenanceLog.findUnique).mockResolvedValue(null);

      await expect(
        MaintenanceService.updateMaintenanceLog("invalid-id", {
          status: MaintenanceStatus.RESOLVED,
        })
      ).rejects.toThrow("Maintenance log not found");
    });

    it("should update log and restore machine status to ACTIVE when no active issues remain", async () => {
      const existing = {
        id: "mnt-1",
        machineId: "mach-1",
        status: MaintenanceStatus.IN_PROGRESS,
      };

      vi.mocked(db.maintenanceLog.findUnique).mockResolvedValue(existing as any);

      const mockUpdated = {
        ...existing,
        status: MaintenanceStatus.RESOLVED,
        resolvedAt: new Date(),
        correctiveAction: "Replaced blown thermal fuse",
      };

      vi.mocked(db.maintenanceLog.update).mockResolvedValue(mockUpdated as any);
      vi.mocked(db.maintenanceLog.count).mockResolvedValue(0); // 0 active issues left
      vi.mocked(db.machine.update).mockResolvedValue({ id: "mach-1", status: "ACTIVE" } as any);

      const result = await MaintenanceService.updateMaintenanceLog(
        "mnt-1",
        {
          status: MaintenanceStatus.RESOLVED,
          correctiveAction: "Replaced blown thermal fuse",
          downtimeMinutes: 60,
        },
        "tech-user-1"
      );

      expect(result).toEqual(mockUpdated);
      expect(db.maintenanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "mnt-1" },
          data: expect.objectContaining({
            status: MaintenanceStatus.RESOLVED,
            resolvedById: "tech-user-1",
          }),
        })
      );
      expect(db.machine.update).toHaveBeenCalledWith({
        where: { id: "mach-1" },
        data: { status: "ACTIVE" },
      });
    });
  });

  describe("getMaintenanceStats", () => {
    it("should compute maintenance KPIs and machine downtime breakdown", async () => {
      const mockAllLogs = [
        {
          id: "mnt-1",
          machineId: "m-1",
          type: MaintenanceType.BREAKDOWN,
          priority: MaintenancePriority.HIGH,
          status: MaintenanceStatus.OPEN,
          downtimeMinutes: 30,
          cost: 100,
          machine: { id: "m-1", name: "Loom 01", section: { name: "Weaving" } },
        },
        {
          id: "mnt-2",
          machineId: "m-1",
          type: MaintenanceType.PREVENTATIVE,
          priority: MaintenancePriority.LOW,
          status: MaintenanceStatus.RESOLVED,
          downtimeMinutes: 45,
          cost: 50,
          machine: { id: "m-1", name: "Loom 01", section: { name: "Weaving" } },
        },
      ];

      const mockTodayLogs = [{ downtimeMinutes: 30 }];
      const mockMonthLogs = [{ downtimeMinutes: 30 }, { downtimeMinutes: 45 }];
      const mockMachines = [
        { id: "m-1", name: "Loom 01", status: "MAINTENANCE" },
        { id: "m-2", name: "Loom 02", status: "ACTIVE" },
      ];

      vi.mocked(db.maintenanceLog.findMany)
        .mockResolvedValueOnce(mockAllLogs as any)
        .mockResolvedValueOnce(mockTodayLogs as any)
        .mockResolvedValueOnce(mockMonthLogs as any);

      vi.mocked(db.machine.findMany).mockResolvedValue(mockMachines as any);

      const stats = await MaintenanceService.getMaintenanceStats();

      expect(stats.totalLogs).toBe(2);
      expect(stats.openCount).toBe(1);
      expect(stats.resolvedCount).toBe(1);
      expect(stats.criticalCount).toBe(1);
      expect(stats.totalDowntimeMinutes).toBe(75);
      expect(stats.todayDowntimeMinutes).toBe(30);
      expect(stats.monthDowntimeMinutes).toBe(75);
      expect(stats.totalMaintenanceCost).toBe(150);
      expect(stats.totalMachines).toBe(2);
      expect(stats.machinesInMaintenance).toBe(1);
      expect(stats.machineDowntimeBreakdown[0].machineName).toBe("Loom 01");
      expect(stats.machineDowntimeBreakdown[0].totalDowntime).toBe(75);
    });
  });
});
