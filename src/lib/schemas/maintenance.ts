import { z } from "zod";
import { MaintenanceType, MaintenanceStatus, MaintenancePriority } from "@/generated/prisma";

export const CreateMaintenanceLogSchema = z.object({
  machineId: z.string().min(1, "Machine is required"),
  type: z.nativeEnum(MaintenanceType).default(MaintenanceType.BREAKDOWN),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
  title: z.string().min(1, "Title / Issue summary is required"),
  description: z.string().min(1, "Description is required"),
  downtimeMinutes: z.number().int().min(0).default(0),
  cost: z.number().min(0).optional(),
  assignedTechnicianId: z.string().optional(),
  reportedAt: z.union([z.string(), z.date()]).optional(),
});

export type CreateMaintenanceLogInput = z.infer<typeof CreateMaintenanceLogSchema>;

export const UpdateMaintenanceLogSchema = z.object({
  type: z.nativeEnum(MaintenanceType).optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  downtimeMinutes: z.number().int().min(0).optional(),
  cost: z.number().min(0).optional(),
  assignedTechnicianId: z.string().nullable().optional(),
  startedAt: z.union([z.string(), z.date()]).nullable().optional(),
  resolvedAt: z.union([z.string(), z.date()]).nullable().optional(),
  correctiveAction: z.string().nullable().optional(),
  partsReplaced: z.string().nullable().optional(),
});

export type UpdateMaintenanceLogInput = z.infer<typeof UpdateMaintenanceLogSchema>;

export const ListMaintenanceLogsQuerySchema = z.object({
  machineId: z.string().optional(),
  sectionId: z.string().optional(),
  type: z.nativeEnum(MaintenanceType).optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export type ListMaintenanceLogsQuery = z.infer<typeof ListMaintenanceLogsQuerySchema>;
