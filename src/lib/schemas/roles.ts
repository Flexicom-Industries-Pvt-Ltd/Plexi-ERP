import { z } from "zod";
import { Module } from "@/generated/prisma";

export const RolePermissionSchema = z.object({
  module: z.nativeEnum(Module),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
});

export const CreateRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(RolePermissionSchema),
});

export const UpdateRoleSchema = CreateRoleSchema.extend({
  id: z.string(),
});

export const DeleteRoleSchema = z.object({
  id: z.string(),
});
