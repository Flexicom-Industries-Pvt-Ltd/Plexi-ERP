import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { TapePlantClient } from "./tape-plant-client";

export const metadata: Metadata = {
  title: "Tape Plant Module (Kathua) | Plascom ERP",
  description: "End-to-end digitised tape plant planning, process temperature, drive parameters, raw material stock, post-production and reporting",
};

export const dynamic = "force-dynamic";

export default async function TapePlantPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return <TapePlantClient />;
}
