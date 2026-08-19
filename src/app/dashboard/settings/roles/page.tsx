import { Metadata } from "next";
import { db } from "@/lib/db";
import { RolesClient } from "./roles-client";
import { Module } from "@/generated/prisma";
import { requirePermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Role Management",
  description: "Manage system roles and permissions",
};

export default async function RolesPage() {
  await requirePermission(Module.SETTINGS, "canRead");

  const roles = await db.role.findMany({
    include: {
      permissions: true,
      _count: {
        select: { users: true }
      }
    },
    orderBy: {
      name: "asc",
    },
  });

  // Get the available modules from the Prisma enum
  const modules = Object.values(Module) as string[];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Roles & Permissions</h3>
        <p className="text-sm text-muted-foreground">
          Create roles and assign feature-level permissions across modules.
        </p>
      </div>
      <RolesClient roles={roles} modules={modules} />
    </div>
  );
}
