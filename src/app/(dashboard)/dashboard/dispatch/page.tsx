import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { DispatchClient } from "./dispatch-client";

export const metadata: Metadata = {
  title: "Commercial Dispatch & Logistics | Plexi-ERP",
  description: "Dispatch orders, Finished Goods picking, truck loading, and inventory OUT execution",
};

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  await requirePermission(Module.DISPATCH, "canRead");
  return <DispatchClient />;
}

