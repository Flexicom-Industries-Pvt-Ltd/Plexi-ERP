import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  employeeId: z.string().optional(),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  employeeId: z.string().optional(),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
});

export const ToggleStatusSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});

export const UpdateProfileSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  phone: z.string().optional(),
});
