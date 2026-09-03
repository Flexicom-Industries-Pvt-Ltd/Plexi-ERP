"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Settings,
  ShieldCheck,
  PackageSearch,
  Factory,
  CheckCircle,
  Truck,
  ChevronDown,
  Database,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { FINISHING_ROUTES } from "@/lib/production/finishing-routes";

const baseProductionItems = [
  { title: "Overview", url: "/dashboard/production" },
  { title: "Shift Plans", url: "/dashboard/production/plans" },
  { title: "Shift Handover", url: "/dashboard/production/handovers" },
  { title: "Bobbin Production", url: "/dashboard/production/bobbin" },
  { title: "Loom Production", url: "/dashboard/production/loom" },
  { title: "Lamination", url: "/dashboard/production/lamination" },
  { title: "Printing", url: "/dashboard/production/printing" },
  { title: "Cutting", url: "/dashboard/production/cutting" },
];

const finishingNavItems = FINISHING_ROUTES.map((r) => ({
  title: r.label,
  url: r.path,
  finishingRoute: r.value,
}));

const tailProductionItems = [
  { title: "Baling", url: "/dashboard/production/baling" },
  { title: "Roll Stock", url: "/dashboard/production/rolls" },
  { title: "Phase Characteristics", url: "/dashboard/data-centre/production-characteristics" },
];

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: null },
  { title: "Security & Gate", url: "/dashboard/gate", icon: ShieldCheck, module: "SECURITY_GATE" },
  { title: "Inventory", url: "/dashboard/inventory", icon: PackageSearch, module: "INVENTORY" },
  { title: "Production", url: "/dashboard/production", icon: Factory, module: "PRODUCTION" },
  { title: "Quality Control", url: "/dashboard/quality", icon: CheckCircle, module: "QUALITY_CONTROL" },
  { title: "Dispatch", url: "/dashboard/dispatch", icon: Truck, module: "DISPATCH" },
];

const settingsItems = [
  { title: "General Settings", url: "/dashboard/settings/organization" },
  { title: "Users", url: "/dashboard/settings/users" },
  { title: "Roles", url: "/dashboard/settings/roles" },
  { title: "System Logs", url: "/dashboard/settings/logs" },
  { title: "API Documentation", url: "/dashboard/api-docs" },
];

const dataCentreItems = [
  { title: "Drivers", url: "/dashboard/data-centre/driver" },
  { title: "Stocks", url: "/dashboard/data-centre/stock" },
  { title: "Units", url: "/dashboard/data-centre/units" },
  { title: "Item Categories", url: "/dashboard/data-centre/categories" },
  { title: "Sub Categories", url: "/dashboard/data-centre/sub-categories" },
  { title: "Production Characteristics", url: "/dashboard/data-centre/production-characteristics" },
];

function isProductionSubActive(pathname: string, url: string) {
  if (url === "/dashboard/production") {
    return pathname === url;
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

type AppSidebarProps = {
  user: any;
  allowedModules: Record<string, boolean>;
};

export function AppSidebar({ user, allowedModules, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/dashboard/settings"));
  const [dataCentreOpen, setDataCentreOpen] = useState(pathname.startsWith("/dashboard/data-centre"));
  const [productionOpen, setProductionOpen] = useState(
    pathname.startsWith("/dashboard/production") ||
      pathname.startsWith("/dashboard/data-centre/production-characteristics"),
  );

  // Super Admin bypass
  const isSuperAdmin = user?.role?.name === "Super Admin";
  const hasSettingsAccess = isSuperAdmin || allowedModules["SETTINGS"];
  const hasDataCentreAccess = isSuperAdmin || allowedModules["DATA_CENTRE"];
  const hasProductionAccess = isSuperAdmin || allowedModules["PRODUCTION"];

  const [activeFinishingRoutes, setActiveFinishingRoutes] = useState<string[]>([]);

  useEffect(() => {
    if (!hasProductionAccess) return;
    fetch("/api/production/finishing/active-routes")
      .then((r) => (r.ok ? r.json() : { routes: [] }))
      .then((data) => setActiveFinishingRoutes(data.routes ?? []))
      .catch(() => setActiveFinishingRoutes([]));
  }, [hasProductionAccess]);

  const productionItems = useMemo(() => {
    const visibleFinishing = finishingNavItems.filter((item) =>
      activeFinishingRoutes.includes(item.finishingRoute) ||
      pathname.startsWith(item.url),
    );
    return [...baseProductionItems, ...visibleFinishing, ...tailProductionItems];
  }, [activeFinishingRoutes, pathname]);

  const visibleNavItems = navItems.filter(
    (item) => item.title !== "Production" && (!item.module || isSuperAdmin || allowedModules[item.module]),
  );

  return (
    <Sidebar className="border-r border-border/50 bg-slate-50 shadow-sm transition-all duration-300 font-sans" variant="inset" collapsible="icon">
      <SidebarHeader className="h-[72px] flex items-center px-4 border-b border-border/50 bg-white overflow-hidden transition-all duration-300">
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold w-full">
          <div className="flex shrink-0 items-center justify-center rounded-lg hover:opacity-80 transition-opacity bg-white p-1 shadow-sm border border-slate-100">
            <Image src="/logo.png" alt="Flexicom Logo" width={40} height={40} className="h-10 w-10 object-contain" />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">Flexicom</span>
            <span className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">ERP System</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {visibleNavItems.map((item) => (
            <Fragment key={item.url}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={item.url} />}
                  isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                  tooltip={item.title}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {item.title === "Inventory" && hasProductionAccess && (
                <Collapsible open={productionOpen} onOpenChange={setProductionOpen} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip="Production"
                          isActive={
                            pathname.startsWith("/dashboard/production") ||
                            pathname.startsWith("/dashboard/data-centre/production-characteristics")
                          }
                        />
                      }
                    >
                      <Factory className="h-4 w-4" />
                      <span>Production</span>
                      <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {productionItems.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.url}>
                            <SidebarMenuSubButton
                              render={<Link href={subItem.url} />}
                              isActive={isProductionSubActive(pathname, subItem.url)}
                            >
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
            </Fragment>
          ))}
          
          {hasDataCentreAccess && (
            <Collapsible open={dataCentreOpen} onOpenChange={setDataCentreOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip="Data Centre" />}>
                    <Database className="h-4 w-4" />
                    <span>Data Centre</span>
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {dataCentreItems.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.url}>
                        <SidebarMenuSubButton
                          render={<Link href={subItem.url} />}
                          isActive={pathname === subItem.url}
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {hasSettingsAccess && (
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip="Settings" />}>
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {settingsItems.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.url}>
                        <SidebarMenuSubButton
                          render={<Link href={subItem.url} />}
                          isActive={pathname === subItem.url}
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-secondary/10 transition-colors rounded-xl"
                />
              }>
                  <Avatar className="h-9 w-9 shrink-0 rounded-xl border border-primary/20 shadow-sm transition-transform group-hover:scale-105">
                    <AvatarFallback className="rounded-xl bg-gradient-brand text-white text-xs font-bold">
                      {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0">
                    <span className="truncate font-semibold text-primary">{user?.name || "User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email || ""}</span>
                  </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                          {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{user?.name || "User"}</span>
                        <span className="truncate text-xs text-muted-foreground">{user?.email || ""}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push("/dashboard/profile")} className="cursor-pointer">
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/auth/login' })} className="text-red-600 font-medium cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
