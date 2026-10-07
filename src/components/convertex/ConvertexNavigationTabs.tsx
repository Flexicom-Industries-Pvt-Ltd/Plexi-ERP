"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, Trash2, BarChart3 } from "lucide-react";

interface ConvertexNavigationTabsProps {
  currentTab?: "production" | "wastage" | "summary";
}

export function ConvertexNavigationTabs({ currentTab }: ConvertexNavigationTabsProps) {
  const pathname = usePathname();

  const isProduction = currentTab === "production" || pathname === "/dashboard/production/convertex";
  const isWastage = currentTab === "wastage" || pathname === "/dashboard/production/convertex/wastage";
  const isSummary = currentTab === "summary" || pathname === "/dashboard/production/convertex/summary";

  const tabs = [
    {
      title: "Daily Production Report",
      href: "/dashboard/production/convertex",
      active: isProduction,
      icon: Scissors,
      description: "Meter readings, pieces, kg, & cover/valve patches",
    },
    {
      title: "Wastage Report",
      href: "/dashboard/production/convertex/wastage",
      active: isWastage,
      icon: Trash2,
      description: "Roll-by-roll wastage breakdown & net production",
    },
    {
      title: "Production & Wastage Summary",
      href: "/dashboard/production/convertex/summary",
      active: isSummary,
      icon: BarChart3,
      description: "Quality-wise aggregation, waste analysis, & grand totals",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs mb-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab.active
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.active ? "text-white" : "text-slate-500"}`} />
              <span>{tab.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
