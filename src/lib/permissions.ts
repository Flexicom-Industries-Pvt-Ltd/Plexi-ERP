import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Module } from "@/generated/prisma";
import { redirect } from "next/navigation";
import { isSuperAdminRole } from "@/lib/rbac";

/**
 * getAuthenticatedUserWithRole
 * Cached per-request using React cache() to eliminate duplicate queries between
 * DashboardLayout and individual Page requirePermission calls.
 */
export const getAuthenticatedUserWithRole = cache(async () => {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return null;
  }

  try {
    return await db.user.findFirst({
      where: {
        OR: [
          ...(session.user.id ? [{ id: session.user.id }] : []),
          ...(session.user.email ? [{ email: session.user.email }] : []),
        ],
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });
  } catch (err) {
    console.error("Failed to query authenticated user from database:", err);
    // Fail-closed for security: do not fabricate active status on database failures (ERP-028)
    return null;
  }
});

/**
 * requirePermission
 * Checks if the currently authenticated user has the required permission for a specific module.
 * If they do not have the permission, it instantly redirects them to an unauthorized page.
 */
export async function requirePermission(
  module: Module, 
  action: "canRead" | "canCreate" | "canUpdate" | "canDelete"
) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  // 1. Strict verification of active user status from database (ERP-001, ERP-033, ERP-040)
  const user = await getAuthenticatedUserWithRole();
  if (!user || !user.isActive) {
    redirect("/auth/login?error=account_inactive");
  }

  // 2. Admin role bypass (case-insensitive & variant-aware) (ERP-010)
  const userRoleName = user.role?.name || session.user.role || (session.user as any).roleName;
  if (isSuperAdminRole(userRoleName)) {
    return true;
  }

  if (!user.role) {
    redirect("/dashboard/unauthorized");
  }

  const permissions = (user.role.permissions as any[]) || [];
  const modulePerms = permissions.find((p: any) => p.module === module || p.module === ("ALL" as any));
  if (!modulePerms || !modulePerms[action]) {
    redirect("/dashboard/unauthorized");
  }

  return true;
}

