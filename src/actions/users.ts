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

export const createUser = safeAction(CreateUserSchema, async (data) => {
  const result = await UserService.createUser(data);
  revalidatePath('/dashboard/settings/users');
  return result;
});

export const updateUser = safeAction(UpdateUserSchema, async (data) => {
  const { id, ...updateData } = data;
  const result = await UserService.updateUser(id, updateData);
  revalidatePath('/dashboard/settings/users');
  return result;
});

export const toggleUserStatus = safeAction(ToggleStatusSchema, async (data) => {
  const { id, isActive } = data;
  const result = await UserService.toggleStatus(id, isActive);
  revalidatePath('/dashboard/settings/users');
  return { id: result.id, isActive: result.isActive };
});

export const updateProfile = safeAction(UpdateProfileSchema, async (data) => {
  const { id, ...updateData } = data;
  const result = await UserService.updateUser(id, updateData);
  revalidatePath('/dashboard/profile');
  return result;
});
