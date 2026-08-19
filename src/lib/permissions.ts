import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Module } from "@/generated/prisma";
import { redirect } from "next/navigation";

/**
 * requirePermission
 * Checks if the currently authenticated user has the required permission for a specific module.
 * If they do not have the permission, it instantly redirects them to an unauthorized page.
 * 
 * @param module The Module enum to check against.
 * @param action The specific action required (canRead, canCreate, canUpdate, canDelete).
 */
export async function requirePermission(
  module: Module, 
  action: "canRead" | "canCreate" | "canUpdate" | "canDelete"
) {
  const session = await auth();
  
  if (!session || !session.user) {
    redirect("/auth/login");
  }

  // Fetch user's role from the DB
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      role: {
        include: {
          permissions: true
        }
      }
    }
  });

  if (!user || !user.isActive) {
    redirect("/auth/login?error=account_inactive");
  }

  if (!user.role) {
    redirect("/dashboard/unauthorized");
  }

  // Find the exact permission block for this module
  const modulePerms = user.role.permissions.find(p => p.module === module);

  if (!modulePerms || !modulePerms[action]) {
    redirect("/dashboard/unauthorized");
  }

  return true; // Passed check
}
