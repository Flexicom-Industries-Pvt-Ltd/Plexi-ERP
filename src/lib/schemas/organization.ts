import { z } from "zod";
import { LocationType } from "@/generated/prisma";

// Department Schema
export const DepartmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Department name must be at least 2 characters"),
  code: z.string().min(2, "Department code must be at least 2 characters").toUpperCase(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type DepartmentInput = z.infer<typeof DepartmentSchema>;

// Section Schema
export const SectionSchema = z.object({
  id: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  name: z.string().min(2, "Section name must be at least 2 characters"),
  code: z.string().min(2, "Section code must be at least 2 characters").toUpperCase(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type SectionInput = z.infer<typeof SectionSchema>;

// Location Schema
export const LocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Location name must be at least 2 characters"),
  code: z.string().min(2, "Location code must be at least 2 characters").toUpperCase(),
  type: z.nativeEnum(LocationType, {
    message: "Invalid location type",
  }),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type LocationInput = z.infer<typeof LocationSchema>;

// Machine Schema
export const MachineSchema = z.object({
  id: z.string().optional(),
  sectionId: z.string().min(1, "Section is required"),
  name: z.string().min(2, "Machine name must be at least 2 characters"),
  serialNumber: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).default("ACTIVE"),
  isActive: z.boolean().default(true),
});

export type MachineInput = z.infer<typeof MachineSchema>;
