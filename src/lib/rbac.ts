import { db } from "@/lib/db";
import { Module } from "@/generated/prisma";
import { unstable_cache } from "next/cache";

export type PermissionAction = "canCreate" | "canRead" | "canUpdate" | "canDelete";

/**
 * Case-insensitive and variant-aware Super Admin / System Admin detector (ERP-010)
 */
export function isSuperAdminRole(roleName?: string | null): boolean {
  if (!roleName) return false;
  const normalized = roleName.trim().toUpperCase().replace(/[\s_-]/g, "");
  return (
    normalized === "SUPERADMIN" ||
    normalized === "SUPER_ADMIN" ||
    normalized === "SYSTEMADMIN" ||
    normalized === "SYSTEM_ADMIN" ||
    normalized === "ADMIN"
  );
}

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
  // Canonical escape hatch for System Admins & Super Admins (ERP-010)
  if (isSuperAdminRole(roleName)) {
    return true;
  }

  const permission = await getRolePermissions(roleName, moduleName);

  if (!permission) {
    return false;
  }

  return permission[action] === true;
}
