"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface InventorySubNavProps {
  pendingCount?: number;
}

export function InventorySubNav({ pendingCount }: InventorySubNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "All Items",
      href: "/dashboard/inventory/items",
      icon: Package,
      isActive: pathname.startsWith("/dashboard/inventory/items") || pathname === "/dashboard/inventory",
    },
    {
      title: "Pending Gate Receipts",
      href: "/dashboard/inventory/gate-receipts",
      icon: Clock,
      isActive: pathname.startsWith("/dashboard/inventory/gate-receipts"),
      count: pendingCount,
    },
    {
      title: "Stock Ledger",
      href: "/dashboard/inventory/transactions",
      icon: Activity,
      isActive: pathname.startsWith("/dashboard/inventory/transactions"),
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs sm:text-sm">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "font-bold px-3.5 py-2 rounded-xl border transition-all duration-150 whitespace-nowrap flex items-center gap-2 shadow-2xs touch-manipulation",
              item.isActive
                ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", item.isActive ? "text-white" : "text-slate-500")} />
            <span>{item.title}</span>
            {item.count !== undefined && item.count > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-black min-w-[18px] text-center",
                  item.isActive ? "bg-amber-400 text-slate-950" : "bg-amber-100 text-amber-800"
                )}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

