import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { QualityClient } from "./quality-client";

export const metadata: Metadata = {
  title: "Quality Control | Flexicom ERP",
  description: "Inspection queue, real-time quality verification, and pass/fail/rework decisions",
};

export const dynamic = "force-dynamic";

export default async function QualityControlPage() {
  await requirePermission(Module.QUALITY_CONTROL, "canRead");
  return <QualityClient />;
}
