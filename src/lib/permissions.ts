import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Module } from "@/generated/prisma";
import { redirect } from "next/navigation";

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

  return db.user.findFirst({
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

  // Fast-path: Super Admin bypass (0ms DB cost)
  const roleName = session.user.role || (session.user as any).roleName;
  if (
    roleName === "Super Admin" ||
    roleName === "SuperAdmin" ||
    roleName === "SUPERADMIN" ||
    roleName === "SUPER_ADMIN"
  ) {
    return true;
  }

  // Fast-path: Check session JWT permissions directly if available (0ms DB cost)
  const sessionPerms = (session.user as any).permissions as Array<{ module: string; canRead?: boolean; canCreate?: boolean; canUpdate?: boolean; canDelete?: boolean }> | undefined;
  if (sessionPerms && Array.isArray(sessionPerms) && sessionPerms.length > 0) {
    const perm = sessionPerms.find((p) => p.module === module || p.module === "ALL");
    if (perm && perm[action]) {
      return true;
    }
  }

  // Fallback: Fetch user with role & permissions from cached DB query
  const user = await getAuthenticatedUserWithRole();
  if (!user || !user.isActive) {
    redirect("/auth/login?error=account_inactive");
  }

  const userRoleName = user.role?.name;
  if (
    userRoleName === "Super Admin" ||
    userRoleName === "SuperAdmin" ||
    userRoleName === "SUPERADMIN" ||
    userRoleName === "SUPER_ADMIN"
  ) {
    return true;
  }

  if (!user.role) {
    redirect("/dashboard/unauthorized");
  }

  const modulePerms = user.role.permissions.find((p) => p.module === module || p.module === ("ALL" as any));
  if (!modulePerms || !modulePerms[action]) {
    redirect("/dashboard/unauthorized");
  }

  return true;
}

