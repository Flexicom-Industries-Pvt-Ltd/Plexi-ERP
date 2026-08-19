import { db } from "@/lib/db";
import { Module } from "@/generated/prisma";
import { unstable_cache } from "next/cache";

export type PermissionAction = "canCreate" | "canRead" | "canUpdate" | "canDelete";

export const getRolePermissions = unstable_cache(
  async (roleName: string, moduleName: Module) => {
    const role = await db.role.findUnique({
      where: { name: roleName },
      include: {
        permissions: {
          where: { module: moduleName },
        },
      },
    });

    if (!role || role.permissions.length === 0) {
      return null;
    }

    return role.permissions[0];
  },
  ["role-permissions"],
  { tags: ["rbac"] }
);

export async function hasPermission(
  roleName: string,
  moduleName: Module,
  action: PermissionAction
): Promise<boolean> {
  // Hardcoded escape hatch for System Admins
  if (roleName === "System Admin") {
    return true;
  }

  const permission = await getRolePermissions(roleName, moduleName);

  if (!permission) {
    return false;
  }

  return permission[action] === true;
}
