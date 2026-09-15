import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import {
  Module,
  MaintenanceType,
  MaintenanceStatus,
  MaintenancePriority,
} from "@/generated/prisma";
import { parsePaginationParams, createPaginationMeta } from "@/lib/pagination";
import {
  CreateMaintenanceLogInput,
  UpdateMaintenanceLogInput,
  ListMaintenanceLogsQuery,
} from "@/lib/schemas/maintenance";

export class MaintenanceService {
  /**
   * Generates a unique maintenance log sequence number (e.g. MNT-20260915-0001).
   */
  static async generateLogNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `MNT-${dateStr}-`;

    const latest = await db.maintenanceLog.findFirst({
      where: { logNumber: { startsWith: prefix } },
      orderBy: { logNumber: "desc" },
      select: { logNumber: true },
    });

    let seq = 1;
    if (latest && latest.logNumber) {
      const parts = latest.logNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  /**
   * List maintenance logs with filtering, search, and pagination.
   */
  static async listMaintenanceLogs(
    query: ListMaintenanceLogsQuery = {},
    options: { paginate?: boolean } = {}
  ) {
    const { machineId, sectionId, type, status, priority, search } = query;

    const where: Record<string, unknown> = {};

    if (machineId) where.machineId = machineId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (sectionId) {
      where.machine = { sectionId };
    }

    if (search) {
      where.OR = [
        { logNumber: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { machine: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const { page, limit, skip, take, isPaginated } = parsePaginationParams(
      { page: query.page, limit: query.limit },
      { defaultLimit: 50, maxLimit: 200 }
    );

    const shouldPaginate = options.paginate || isPaginated;

    const [logs, total] = await Promise.all([
      db.maintenanceLog.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          machine: {
            select: {
              id: true,
              name: true,
              serialNumber: true,
              status: true,
              section: { select: { id: true, name: true, code: true } },
            },
          },
          reportedBy: {
            select: { id: true, name: true, employeeId: true },
          },
          assignedTechnician: {
            select: { id: true, name: true, employeeId: true },
          },
          resolvedBy: {
            select: { id: true, name: true, employeeId: true },
          },
        },
        ...(shouldPaginate ? { skip, take } : {}),
      }),
      db.maintenanceLog.count({ where }),
    ]);

    return {
      logs,
      ...(shouldPaginate ? { meta: createPaginationMeta(total, page, limit) } : {}),
    };
  }

  /**
   * Get single maintenance log by ID.
   */
  static async getMaintenanceLogById(id: string) {
    return db.maintenanceLog.findUnique({
      where: { id },
      include: {
        machine: {
          include: {
            section: true,
          },
        },
        reportedBy: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
        assignedTechnician: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
      },
    });
  }

  /**
   * Create a new maintenance / service log and update Machine status to MAINTENANCE if breakdown.
   */
  static async createMaintenanceLog(
    data: CreateMaintenanceLogInput,
    reportedById?: string
  ) {
    const logNumber = await this.generateLogNumber();
    const reportedAt = data.reportedAt ? new Date(data.reportedAt) : new Date();

    const result = await withTransaction(
      {
        action: "CREATE_MAINTENANCE_LOG",
        module: Module.PRODUCTION,
        newValues: {
          logNumber,
          machineId: data.machineId,
          type: data.type,
          priority: data.priority,
          title: data.title,
          downtimeMinutes: data.downtimeMinutes,
        },
      },
      async (tx) => {
        const log = await tx.maintenanceLog.create({
          data: {
            logNumber,
            machineId: data.machineId,
            type: data.type,
            priority: data.priority,
            status: MaintenanceStatus.OPEN,
            title: data.title,
            description: data.description,
            downtimeMinutes: data.downtimeMinutes || 0,
            cost: data.cost,
            reportedById,
            assignedTechnicianId: data.assignedTechnicianId,
            reportedAt,
          },
          include: {
            machine: {
              include: { section: true },
            },
            reportedBy: { select: { id: true, name: true } },
            assignedTechnician: { select: { id: true, name: true } },
          },
        });

        // Update machine status to MAINTENANCE if breakdown or service
        if (
          data.type === MaintenanceType.BREAKDOWN ||
          data.type === MaintenanceType.ROUTINE_SERVICE
        ) {
          await tx.machine.update({
            where: { id: data.machineId },
            data: { status: "MAINTENANCE" },
          });
        }

        return log;
      }
    );

    return result;
  }

  /**
   * Update or resolve maintenance log, automatically restoring Machine status to ACTIVE if all issues resolved.
   */
  static async updateMaintenanceLog(
    id: string,
    data: UpdateMaintenanceLogInput,
    currentUserId?: string
  ) {
    const existing = await db.maintenanceLog.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Maintenance log not found");
    }

    const isResolving =
      data.status === MaintenanceStatus.RESOLVED && existing.status !== MaintenanceStatus.RESOLVED;

    const resolvedAt = isResolving
      ? data.resolvedAt
        ? new Date(data.resolvedAt)
        : new Date()
      : data.resolvedAt === null
      ? null
      : undefined;

    const result = await withTransaction(
      {
        action: "UPDATE_MAINTENANCE_LOG",
        module: Module.PRODUCTION,
        entityId: id,
        newValues: {
          ...data,
          resolvedAt,
        },
      },
      async (tx) => {
        const updated = await tx.maintenanceLog.update({
          where: { id },
          data: {
            type: data.type,
            priority: data.priority,
            status: data.status,
            title: data.title,
            description: data.description,
            downtimeMinutes: data.downtimeMinutes,
            cost: data.cost,
            assignedTechnicianId: data.assignedTechnicianId,
            startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
            resolvedAt,
            resolvedById: isResolving ? currentUserId : undefined,
            correctiveAction: data.correctiveAction,
            partsReplaced: data.partsReplaced,
          },
          include: {
            machine: { include: { section: true } },
            reportedBy: { select: { id: true, name: true } },
            assignedTechnician: { select: { id: true, name: true } },
            resolvedBy: { select: { id: true, name: true } },
          },
        });

        // If resolving or cancelling, check if there are other active issues on this machine
        if (
          data.status === MaintenanceStatus.RESOLVED ||
          data.status === MaintenanceStatus.CANCELLED
        ) {
          const activeIssuesCount = await tx.maintenanceLog.count({
            where: {
              machineId: existing.machineId,
              status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] },
            },
          });

          if (activeIssuesCount === 0) {
            await tx.machine.update({
              where: { id: existing.machineId },
              data: { status: "ACTIVE" },
            });
          }
        }

        return updated;
      }
    );

    return result;
  }

  /**
   * Compute maintenance dashboard KPIs, downtime analytics, and machine breakdown summary.
   */
  static async getMaintenanceStats() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [allLogs, todayLogs, monthLogs, machines] = await Promise.all([
      db.maintenanceLog.findMany({
        select: {
          id: true,
          machineId: true,
          type: true,
          priority: true,
          status: true,
          downtimeMinutes: true,
          cost: true,
          machine: { select: { id: true, name: true, section: { select: { name: true } } } },
        },
      }),
      db.maintenanceLog.findMany({
        where: { reportedAt: { gte: startOfToday } },
        select: { downtimeMinutes: true },
      }),
      db.maintenanceLog.findMany({
        where: { reportedAt: { gte: startOfMonth } },
        select: { downtimeMinutes: true },
      }),
      db.machine.findMany({
        select: { id: true, name: true, status: true, section: { select: { name: true } } },
      }),
    ]);

    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    let criticalCount = 0;
    let totalDowntime = 0;
    let totalMaintenanceCost = 0;

    const typeBreakdown: Record<string, number> = {};
    const machineDowntimeMap: Record<
      string,
      { machineName: string; sectionName: string; totalDowntime: number; ticketCount: number }
    > = {};

    for (const log of allLogs) {
      if (log.status === MaintenanceStatus.OPEN) openCount++;
      if (log.status === MaintenanceStatus.IN_PROGRESS) inProgressCount++;
      if (log.status === MaintenanceStatus.RESOLVED) resolvedCount++;

      if (
        (log.status === MaintenanceStatus.OPEN || log.status === MaintenanceStatus.IN_PROGRESS) &&
        (log.priority === MaintenancePriority.HIGH || log.priority === MaintenancePriority.CRITICAL)
      ) {
        criticalCount++;
      }

      totalDowntime += log.downtimeMinutes;
      totalMaintenanceCost += log.cost || 0;

      typeBreakdown[log.type] = (typeBreakdown[log.type] || 0) + 1;

      const mId = log.machineId;
      if (!machineDowntimeMap[mId]) {
        machineDowntimeMap[mId] = {
          machineName: log.machine?.name || "Unknown Machine",
          sectionName: log.machine?.section?.name || "General",
          totalDowntime: 0,
          ticketCount: 0,
        };
      }
      machineDowntimeMap[mId].totalDowntime += log.downtimeMinutes;
      machineDowntimeMap[mId].ticketCount += 1;
    }

    const todayDowntime = todayLogs.reduce((sum, l) => sum + l.downtimeMinutes, 0);
    const monthDowntime = monthLogs.reduce((sum, l) => sum + l.downtimeMinutes, 0);

    return {
      totalLogs: allLogs.length,
      openCount,
      inProgressCount,
      resolvedCount,
      criticalCount,
      totalDowntimeMinutes: totalDowntime,
      todayDowntimeMinutes: todayDowntime,
      monthDowntimeMinutes: monthDowntime,
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      totalMachines: machines.length,
      machinesInMaintenance: machines.filter((m) => m.status === "MAINTENANCE").length,
      typeBreakdown,
      machineDowntimeBreakdown: Object.values(machineDowntimeMap).sort(
        (a, b) => b.totalDowntime - a.totalDowntime
      ),
    };
  }
}
