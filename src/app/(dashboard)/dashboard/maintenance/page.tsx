import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { MaintenanceClient } from "./maintenance-client";

export const metadata: Metadata = {
  title: "Machine Maintenance & Service | Flexicom ERP",
  description: "Track machine breakdown incidents, scheduled preventative maintenance, and downtime resolution",
};

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  await requirePermission(Module.MAINTENANCE, "canRead");
  return <MaintenanceClient />;
}
