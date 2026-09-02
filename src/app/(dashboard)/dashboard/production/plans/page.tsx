import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductionPlansClient } from "./plans-client";

export const metadata: Metadata = {
  title: "Shift Plans | Production | Flexicom ERP",
};

export const dynamic = "force-dynamic";

export default async function ProductionPlansPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div>
        <Link href="/dashboard/production" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-2">
          <ArrowLeft className="h-4 w-4" /> Production
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Shift Plans</h1>
      </div>
      <ProductionPlansClient />
    </div>
  );
}
