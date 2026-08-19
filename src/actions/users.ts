"use server";

import { withTransaction } from "@/lib/transaction";
import { Module } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createUser(data: any) {
  // Hash the password if provided
  let passwordHash = null;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  const userData = { ...data };
  if (passwordHash) {
    userData.password = passwordHash;
  }

  const result = await withTransaction({
    action: "CREATE_USER",
    module: Module.USERS,
    newValues: { email: data.email, roleId: data.roleId, departmentId: data.departmentId, employeeId: data.employeeId } // Don't log password in audit!
  }, async (tx) => {
    const user = await tx.user.create({ data: userData });
    // Strip password from result
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  revalidatePath('/dashboard/settings/users');
  return result;
}

export async function updateUser(id: string, data: any) {
  // Hash password if updating
  const updateData = { ...data };
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }

  const auditData = { ...updateData };
  delete auditData.password; // Never log password changes!

  const result = await withTransaction({
    action: "UPDATE_USER",
    module: Module.USERS,
    entityId: id,
    newValues: auditData
  }, async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: updateData
    });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  revalidatePath('/dashboard/settings/users');
  return result;
}

export async function toggleUserStatus(id: string, isActive: boolean) {
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
}

export async function updateProfile(id: string, data: any) {
  const updateData = { ...data };
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
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
      data: updateData
    });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  revalidatePath('/dashboard/profile');
  return result;
}
