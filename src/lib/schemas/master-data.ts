import { z } from "zod";
import { LocationType } from "@/generated/prisma";

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
});

export const UpdateDepartmentSchema = CreateDepartmentSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export const CreateSectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  departmentId: z.string().min(1, "Department ID is required"),
  description: z.string().optional(),
});

export const UpdateSectionSchema = CreateSectionSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export const CreateLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  type: z.nativeEnum(LocationType),
  description: z.string().optional(),
});

export const UpdateLocationSchema = CreateLocationSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
});

export const CreateMachineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sectionId: z.string().min(1, "Section ID is required"),
  serialNumber: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
});

export const UpdateMachineSchema = CreateMachineSchema.extend({
  id: z.string(),
  status: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const CreateConfigParameterSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
  description: z.string().optional(),
});

export const UpdateConfigParameterSchema = z.object({
  id: z.string(),
  value: z.string().min(1, "Value is required"),
  description: z.string().optional(),
});
