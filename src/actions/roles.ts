"use server";

import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import { Module } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { safeAction } from "@/lib/safe-action";
import { CreateRoleSchema, UpdateRoleSchema, DeleteRoleSchema } from "@/lib/schemas/roles";

export const createRole = safeAction(CreateRoleSchema, async (data) => {
  const result = await withTransaction({
    action: "CREATE_ROLE",
    module: Module.SETTINGS,
    newValues: { name: data.name, description: data.description, permissions: data.permissions }
  }, async (tx) => {
    const role = await tx.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: {
          create: data.permissions
        }
      },
      include: {
        permissions: true
      }
    });
    return role;
  });

  revalidatePath("/dashboard/settings/roles");
  revalidatePath("/dashboard/settings/users");
  return result;
});

export const updateRole = safeAction(UpdateRoleSchema, async (data) => {
  const { id, ...updateData } = data;
  
  const oldRole = await db.role.findUnique({ where: { id }, include: { permissions: true } });
  if (!oldRole) throw new Error("Role not found");

  const result = await withTransaction({
    action: "UPDATE_ROLE",
    module: Module.SETTINGS,
    oldValues: oldRole,
    newValues: { id, ...updateData }
  }, async (tx) => {
    // First, delete existing permissions
    await tx.rolePermission.deleteMany({
      where: { roleId: id }
    });

    // Then update role and recreate permissions
    const role = await tx.role.update({
      where: { id },
      data: {
        name: updateData.name,
        description: updateData.description,
        permissions: {
          create: updateData.permissions
        }
      },
      include: {
        permissions: true
      }
    });
    return role;
  });

  revalidatePath("/dashboard/settings/roles");
  revalidatePath("/dashboard/settings/users");
  return result;
});

export const deleteRole = safeAction(DeleteRoleSchema, async (data) => {
  const { id } = data;
  
  const oldRole = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!oldRole) throw new Error("Role not found");
  if (oldRole._count.users > 0) throw new Error("Cannot delete role because it is assigned to users.");

  await withTransaction({
    action: "DELETE_ROLE",
    module: Module.SETTINGS,
    oldValues: { id, name: oldRole.name }
  }, async (tx) => {
    await tx.role.delete({ where: { id } });
  });

  revalidatePath("/dashboard/settings/roles");
  return null;
});
