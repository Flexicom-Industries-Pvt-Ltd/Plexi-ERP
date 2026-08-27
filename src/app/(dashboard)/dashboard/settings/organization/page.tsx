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

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#2d2f83]">Organization Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage factory layout, master data, shifts, and business parameters.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <OrganizationClient />
      </div>
    </div>
  );
}
