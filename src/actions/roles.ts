"use server";

import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import { Module } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export type RolePermissionInput = {
  module: Module;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export type ActionResponse<T> = { success: true; data: T } | { success: false; error: string };

export type CreateRoleInput = {
  name: string;
  description?: string;
  permissions: RolePermissionInput[];
};

export async function createRole(data: CreateRoleInput): Promise<ActionResponse<any>> {
  try {
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
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to create role:", error);
    return { success: false, error: error.message || "Failed to create role" };
  }
}

export async function updateRole(id: string, data: CreateRoleInput): Promise<ActionResponse<any>> {
  try {
    const oldRole = await db.role.findUnique({ where: { id }, include: { permissions: true } });
    if (!oldRole) throw new Error("Role not found");

    const result = await withTransaction({
      action: "UPDATE_ROLE",
      module: Module.SETTINGS,
      oldValues: oldRole,
      newValues: { id, ...data }
    }, async (tx) => {
      // First, delete existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });

      // Then update role and recreate permissions
      const role = await tx.role.update({
        where: { id },
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
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Failed to update role:", error);
    return { success: false, error: error.message || "Failed to update role" };
  }
}

export async function deleteRole(id: string): Promise<ActionResponse<any>> {
  try {
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
    return { success: true, data: null };
  } catch (error: any) {
    console.error("Failed to delete role:", error);
    return { success: false, error: error.message || "Failed to delete role" };
  }
}
