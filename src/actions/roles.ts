"use server";

import { revalidatePath } from "next/cache";
import { safeAction } from "@/lib/safe-action";
import { RoleService } from "@/services/role.service";
import { CreateRoleSchema, UpdateRoleSchema, DeleteRoleSchema } from "@/lib/schemas/roles";

export const createRole = safeAction(CreateRoleSchema, async (data) => {
  const result = await RoleService.createRole(data);
  revalidatePath("/dashboard/settings/roles");
  revalidatePath("/dashboard/settings/users");
  return result;
});

export const updateRole = safeAction(UpdateRoleSchema, async (data) => {
  const { id, ...updateData } = data;
  const result = await RoleService.updateRole(id, updateData);
  revalidatePath("/dashboard/settings/roles");
  revalidatePath("/dashboard/settings/users");
  return result;
});

export const deleteRole = safeAction(DeleteRoleSchema, async (data) => {
  const { id } = data;
  await RoleService.deleteRole(id);
  revalidatePath("/dashboard/settings/roles");
  return null;
});
