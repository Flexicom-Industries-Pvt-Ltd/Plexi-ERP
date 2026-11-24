"use server";

import { revalidatePath } from "next/cache";
import { safeAction } from "@/lib/safe-action";
import { RoleService } from "@/services/role.service";
import { CreateRoleSchema, UpdateRoleSchema, DeleteRoleSchema } from "@/lib/schemas/roles";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";

export const createRole = safeAction(CreateRoleSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canCreate");
  const result = await RoleService.createRole(data);
  revalidatePath("/dashboard/settings/roles");
  revalidatePath("/dashboard/settings/users");
  return result;
});

export const updateRole = safeAction(UpdateRoleSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canUpdate");
  const { id, ...updateData } = data;
  const result = await RoleService.updateRole(id, updateData);
  revalidatePath("/dashboard/settings/roles");
  revalidatePath("/dashboard/settings/users");
  return result;
});

export const deleteRole = safeAction(DeleteRoleSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canDelete");
  const { id } = data;
  await RoleService.deleteRole(id);
  revalidatePath("/dashboard/settings/roles");
  return null;
});
