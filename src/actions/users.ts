"use server";

import { withTransaction } from "@/lib/transaction";
import { Module } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { safeAction } from "@/lib/safe-action";
import { 
  CreateUserSchema, 
  UpdateUserSchema, 
  ToggleStatusSchema, 
  UpdateProfileSchema 
} from "@/lib/schemas/users";

export const createUser = safeAction(CreateUserSchema, async (data) => {
  if (data.email) {
    const existingEmail = await db.user.findUnique({ where: { email: data.email } });
    if (existingEmail) throw new Error("A user with this email already exists.");
  }
  if (data.employeeId) {
    const existingEmp = await db.user.findUnique({ where: { employeeId: data.employeeId } });
    if (existingEmp) throw new Error("A user with this Employee ID already exists.");
  }

  let passwordHash = null;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  const userData = { ...data };
  if (passwordHash) {
    userData.password = passwordHash;
  } else {
    delete userData.password;
  }

  const result = await withTransaction({
    action: "CREATE_USER",
    module: Module.USERS,
    newValues: { email: data.email, roleId: data.roleId, departmentId: data.departmentId, employeeId: data.employeeId }
  }, async (tx) => {
    const user = await tx.user.create({ data: userData as any });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  revalidatePath('/dashboard/settings/users');
  return result;
});

export const updateUser = safeAction(UpdateUserSchema, async (data) => {
  const { id, ...updateData } = data;
  
  const oldUser = await db.user.findUnique({ where: { id } });
  if (!oldUser) throw new Error("User not found.");

  if (updateData.email && updateData.email !== oldUser.email) {
    const existingEmail = await db.user.findUnique({ where: { email: updateData.email } });
    if (existingEmail) throw new Error("A user with this email already exists.");
  }
  if (updateData.employeeId && updateData.employeeId !== oldUser.employeeId) {
    const existingEmp = await db.user.findUnique({ where: { employeeId: updateData.employeeId } });
    if (existingEmp) throw new Error("A user with this Employee ID already exists.");
  }

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  } else {
    delete updateData.password;
  }

  const auditData = { ...updateData };
  delete auditData.password;

  const result = await withTransaction({
    action: "UPDATE_USER",
    module: Module.USERS,
    entityId: id,
    newValues: auditData
  }, async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: updateData as any
    });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  revalidatePath('/dashboard/settings/users');
  return result;
});

export const toggleUserStatus = safeAction(ToggleStatusSchema, async (data) => {
  const { id, isActive } = data;
  
  const result = await withTransaction({
    action: isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
    module: Module.USERS,
    entityId: id,
    newValues: { isActive }
  }, async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { isActive }
    });
    return { id: user.id, isActive: user.isActive };
  });

  revalidatePath('/dashboard/settings/users');
  return result;
});

export const updateProfile = safeAction(UpdateProfileSchema, async (data) => {
  const { id, ...updateData } = data;
  
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  } else {
    delete updateData.password;
  }

  const auditData = { ...updateData };
  delete auditData.password;

  const result = await withTransaction({
    action: "UPDATE_PROFILE",
    module: Module.USERS,
    entityId: id,
    newValues: auditData
  }, async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: updateData as any
    });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  revalidatePath('/dashboard/profile');
  return result;
});
