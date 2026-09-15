import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import { Module } from "@/generated/prisma";

export interface RolePermissionInput {
  module: Module;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: RolePermissionInput[];
}

export interface UpdateRoleInput {
  name: string;
  description?: string;
  permissions: RolePermissionInput[];
}

export class RoleService {
  /**
   * List all roles with permissions and user count.
   */
  static async listRoles() {
    return db.role.findMany({
      orderBy: { name: "asc" },
      include: {
        permissions: true,
        _count: {
          select: { users: true },
        },
      },
    });
  }

  /**
   * Get single role by ID with permissions.
   */
  static async getRoleById(id: string) {
    return db.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: { users: true },
        },
      },
    });
  }

  /**
   * Create a new role with assigned permissions.
   */
  static async createRole(data: CreateRoleInput) {
    const existingRole = await db.role.findUnique({ where: { name: data.name } });
    if (existingRole) {
      throw new Error("A role with this name already exists.");
    }

    const result = await withTransaction(
      {
        action: "CREATE_ROLE",
        module: Module.SETTINGS,
        newValues: { name: data.name, description: data.description, permissions: data.permissions },
      },
      async (tx) => {
        const role = await tx.role.create({
          data: {
            name: data.name,
            description: data.description,
            permissions: {
              create: data.permissions,
            },
          },
          include: {
            permissions: true,
          },
        });
        return role;
      }
    );

    return result;
  }

  /**
   * Update role details and synchronize permission matrix.
   */
  static async updateRole(id: string, data: UpdateRoleInput) {
    const oldRole = await db.role.findUnique({ where: { id }, include: { permissions: true } });
    if (!oldRole) throw new Error("Role not found");

    if (data.name !== oldRole.name) {
      const existingName = await db.role.findUnique({ where: { name: data.name } });
      if (existingName) throw new Error("A role with this name already exists.");
    }

    const result = await withTransaction(
      {
        action: "UPDATE_ROLE",
        module: Module.SETTINGS,
        oldValues: oldRole,
        newValues: { id, ...data },
      },
      async (tx) => {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Update role and create updated permissions
        const role = await tx.role.update({
          where: { id },
          data: {
            name: data.name,
            description: data.description,
            permissions: {
              create: data.permissions,
            },
          },
          include: {
            permissions: true,
          },
        });
        return role;
      }
    );

    return result;
  }

  /**
   * Delete role if no active users are assigned.
   */
  static async deleteRole(id: string) {
    const role = await db.role.findUnique({
      where: { id },
      include: {
        users: { select: { id: true } },
        _count: { select: { users: true } },
      },
    });

    if (!role) throw new Error("Role not found");

    const userCount = (role.users && role.users.length) || (role._count && (role._count as any).users) || 0;
    if (userCount > 0) {
      throw new Error("Cannot delete role because it is assigned to users.");
    }

    const result = await withTransaction(
      {
        action: "DELETE_ROLE",
        module: Module.SETTINGS,
        oldValues: role,
      },
      async (tx) => {
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        await tx.role.delete({
          where: { id },
        });

        return { success: true, id };
      }
    );

    return result;
  }
}

