"use server";

import { revalidatePath } from "next/cache";
import { safeAction } from "@/lib/safe-action";
import { UserService } from "@/services/user.service";
import { 
  CreateUserSchema, 
  UpdateUserSchema, 
  ToggleStatusSchema, 
  UpdateProfileSchema 
} from "@/lib/schemas/users";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { auth } from "@/auth";

export const createUser = safeAction(CreateUserSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canCreate");
  const result = await UserService.createUser(data);
  revalidatePath('/dashboard/settings/users');
  return result;
});

export const updateUser = safeAction(UpdateUserSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canUpdate");
  const { id, ...updateData } = data;
  const result = await UserService.updateUser(id, updateData);
  revalidatePath('/dashboard/settings/users');
  return result;
});

export const toggleUserStatus = safeAction(ToggleStatusSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canUpdate");
  const { id, isActive } = data;
  const result = await UserService.toggleStatus(id, isActive);
  revalidatePath('/dashboard/settings/users');
  return { id: result.id, isActive: result.isActive };
});

export const updateProfile = safeAction(UpdateProfileSchema, async (data) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  // Enforce resource ownership: users can update their own profile, or require SETTINGS canUpdate permission (ERP-027)
  if (session.user.id !== data.id) {
    await requirePermission(Module.SETTINGS, "canUpdate");
  }
  const { id, ...updateData } = data;
  const result = await UserService.updateUser(id, updateData);
  revalidatePath('/dashboard/profile');
  return result;
});
