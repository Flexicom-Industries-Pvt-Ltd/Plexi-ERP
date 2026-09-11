"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  PackageSearch,
  Factory,
  LayoutDashboard,
  User,
  PlusCircle,
  Truck,
  Layers,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomBarProps {
  allowedModules?: Record<string, boolean>;
  isSuperAdmin?: boolean;
}

export function MobileBottomBar({
  allowedModules = {},
  isSuperAdmin = false,
}: MobileBottomBarProps) {
  const pathname = usePathname();

  // Determine current active module context
  const isGate = pathname.startsWith("/dashboard/gate");
  const isInventory = pathname.startsWith("/dashboard/inventory");
  const isProduction = pathname.startsWith("/dashboard/production");

  let tabs: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    isAction?: boolean;
  }> = [];

  if (isGate) {
    tabs = [
      {
        href: "/dashboard/gate",
        label: "Live Trucks",
        icon: Truck,
        isActive: pathname === "/dashboard/gate",
      },
      {
        href: "/dashboard/gate/new",
        label: "New Entry",
        icon: PlusCircle,
        isActive: pathname === "/dashboard/gate/new",
        isAction: true,
      },
      {
        href: "/dashboard",
        label: "Hub",
        icon: LayoutDashboard,
        isActive: pathname === "/dashboard",
      },
      {
        href: "/dashboard/profile",
        label: "Profile",
        icon: User,
        isActive: pathname.startsWith("/dashboard/profile"),
      },
    ];
  } else if (isInventory) {
    tabs = [
      {
        href: "/dashboard/inventory",
        label: "Stock Feed",
        icon: PackageSearch,
        isActive: pathname === "/dashboard/inventory",
      },
      {
        href: "/dashboard/inventory/gate-receipts",
        label: "Receipts",
        icon: ClipboardList,
        isActive: pathname === "/dashboard/inventory/gate-receipts",
      },
      {
        href: "/dashboard",
        label: "Hub",
        icon: LayoutDashboard,
        isActive: pathname === "/dashboard",
      },
      {
        href: "/dashboard/profile",
        label: "Profile",
        icon: User,
        isActive: pathname.startsWith("/dashboard/profile"),
      },
    ];
  } else if (isProduction) {
    tabs = [
      {
        href: "/dashboard/production",
        label: "Overview",
        icon: Factory,
        isActive: pathname === "/dashboard/production",
      },
      {
        href: "/dashboard/production/plans",
        label: "Shift Plans",
        icon: Layers,
        isActive: pathname === "/dashboard/production/plans",
      },
      {
        href: "/dashboard",
        label: "Hub",
        icon: LayoutDashboard,
        isActive: pathname === "/dashboard",
      },
      {
        href: "/dashboard/profile",
        label: "Profile",
        icon: User,
        isActive: pathname.startsWith("/dashboard/profile"),
      },
    ];
  } else {
    // General Dashboard Navigation
    const items = [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        isActive: pathname === "/dashboard",
        visible: true,
      },
      {
        href: "/dashboard/gate",
        label: "Gate",
        icon: ShieldCheck,
        isActive: pathname.startsWith("/dashboard/gate"),
        visible: isSuperAdmin || Boolean(allowedModules["SECURITY_GATE"]),
      },
      {
        href: "/dashboard/inventory",
        label: "Inventory",
        icon: PackageSearch,
        isActive: pathname.startsWith("/dashboard/inventory"),
        visible: isSuperAdmin || Boolean(allowedModules["INVENTORY"]),
      },
      {
        href: "/dashboard/production",
        label: "Production",
        icon: Factory,
        isActive: pathname.startsWith("/dashboard/production"),
        visible: isSuperAdmin || Boolean(allowedModules["PRODUCTION"]),
      },
      {
        href: "/dashboard/profile",
        label: "Profile",
        icon: User,
        isActive: pathname.startsWith("/dashboard/profile"),
        visible: true,
      },
    ];

    tabs = items.filter((item) => item.visible);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-xl md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile Navigation"
    >
      <div
        className={cn(
          "mx-auto grid h-16 max-w-lg items-center px-2",
          tabs.length === 3 && "grid-cols-3",
          tabs.length === 4 && "grid-cols-4",
          tabs.length === 5 && "grid-cols-5"
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isAction = tab.isAction;

          if (isAction) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                className="flex flex-col items-center justify-center gap-0.5 touch-manipulation group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30 transition-transform active:scale-95">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold text-primary">{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 text-center touch-manipulation transition-colors",
                tab.isActive
                  ? "text-primary font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                  tab.isActive && "bg-primary/10 text-primary"
                )}
              >
                <Icon className={cn("h-5 w-5", tab.isActive && "stroke-[2.5px]")} />
              </div>
              <span className="text-[10px] tracking-tight leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
