import { db } from "@/lib/db";
import { UsersClient } from "./users-client";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Management | Plexi-ERP",
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePermission(Module.SETTINGS, "canRead");

  const [users, roles, departments] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        role: true,
        department: true
      }
    }),
    db.role.findMany({
      orderBy: { name: 'asc' }
    }),
    db.department.findMany({
      orderBy: { name: 'asc' }
    })
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2d2f83]">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage system users, their roles, departments, and activation status.
        </p>
      </div>

      <UsersClient 
        users={users}
        roles={roles}
        departments={departments}
      />
    </div>
  );
}
