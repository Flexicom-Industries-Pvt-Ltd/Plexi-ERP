import { db } from "@/lib/db";
import { OrganizationClient } from "./organization-client";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organization Settings | Plexi-ERP",
};

export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage() {
  await requirePermission(Module.SETTINGS, "canRead");

  // Fetch master data directly from DB in server component
  const [departments, sections, locations, machines] = await Promise.all([
    db.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { sections: true } } }
    }),
    db.section.findMany({
      orderBy: { name: 'asc' },
      include: { department: true, _count: { select: { machines: true } } }
    }),
    db.location.findMany({
      orderBy: { name: 'asc' }
    }),
    db.machine.findMany({
      orderBy: { name: 'asc' },
      include: { section: true }
    })
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2d2f83]">Organization Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage departments, sections, physical locations, and machine master data.
        </p>
      </div>

      <OrganizationClient 
        departments={departments}
        sections={sections}
        locations={locations}
        machines={machines}
      />
    </div>
  );
}
