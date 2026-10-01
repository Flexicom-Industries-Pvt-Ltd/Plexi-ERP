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
  ChevronDown,
  Database,
  Layers,
  Grid,
  Film,
  Printer,
  Scissors,
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

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: null },
  { title: "Security & Gate", url: "/dashboard/gate", icon: ShieldCheck, module: "SECURITY_GATE" },
  { title: "Inventory", url: "/dashboard/inventory", icon: PackageSearch, module: "INVENTORY" },
];

const tapePlantItems = [
  { title: "Planning", url: "/dashboard/production/tape-plant?tab=planning" },
  { title: "Process Temperature", url: "/dashboard/production/tape-plant?tab=temperature" },
  { title: "Process Drive Parameter", url: "/dashboard/production/tape-plant?tab=drive" },
  { title: "Raw Material", url: "/dashboard/production/tape-plant?tab=raw-material" },
  { title: "Post Production Entry", url: "/dashboard/production/tape-plant?tab=post-production" },
  { title: "Bobbin Stock Summary", url: "/dashboard/production/tape-plant?tab=bobbin-stock" },
  { title: "Bobbin Issue", url: "/dashboard/production/tape-plant?tab=bobbin-issue" },
  { title: "Report", url: "/dashboard/production/tape-plant?tab=reports" },
];

const loomItems = [
  { title: "Loom Summary", url: "/dashboard/production/loom?tab=summary" },
  { title: "Change Over Sheet", url: "/dashboard/production/loom?tab=changeover" },
  { title: "2 Hours Reading Sheet", url: "/dashboard/production/loom?tab=reading-sheet" },
  { title: "Roll Cutting Report", url: "/dashboard/production/loom?tab=roll-cutting" },
  { title: "Roll Stock", url: "/dashboard/production/loom?tab=roll-stock" },
  { title: "Production Report", url: "/dashboard/production/loom?tab=production-report" },
];

const laminationItems = [
  { title: "Production Report", url: "/dashboard/production/lamination" },
  { title: "Raw Material Entry", url: "/dashboard/production/lamination/raw-materials" },
  { title: "Wastage Report", url: "/dashboard/production/lamination/wastage" },
  { title: "Production Summary", url: "/dashboard/production/lamination/summary" },
];

const printingItems = [
  { title: "Daily Production Report", url: "/dashboard/production/printing" },
  { title: "Raw Material Entry", url: "/dashboard/production/printing/raw-materials" },
  { title: "Wastage Report", url: "/dashboard/production/printing/wastage" },
  { title: "Production Summary", url: "/dashboard/production/printing/summary" },
];

const convertexItems = [
  { title: "Daily Production Report", url: "/dashboard/production/convertex" },
  { title: "Wastage Report", url: "/dashboard/production/convertex/wastage" },
  { title: "Production Summary", url: "/dashboard/production/convertex/summary" },
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
  { title: "Supervisors", url: "/dashboard/data-centre/supervisors" },
  { title: "Operators", url: "/dashboard/data-centre/operators" },
  { title: "Contractors", url: "/dashboard/data-centre/contractors" },
  { title: "Stocks", url: "/dashboard/data-centre/stock" },
  { title: "Units", url: "/dashboard/data-centre/units" },
  { title: "Item Categories", url: "/dashboard/data-centre/categories" },
  { title: "Sub Categories", url: "/dashboard/data-centre/sub-categories" },
  { title: "Production Characteristics", url: "/dashboard/data-centre/production-characteristics" },
  { title: "Manpower Rules", url: "/dashboard/data-centre/manpower-rules" },
  { title: "Tape Plant Recipe", url: "/dashboard/data-centre/tape-plant-recipe" },
  { title: "Loom Machine Mapping", url: "/dashboard/data-centre/loom-machine-mapping" },
  { title: "Lamination Raw Material", url: "/dashboard/data-centre/lamination-raw-materials" },
  { title: "Printing Raw Material", url: "/dashboard/data-centre/printing-raw-materials" },
  { title: "Party Printing Details", url: "/dashboard/data-centre/party-printing" },
];

type AppSidebarProps = {
  user: any;
  allowedModules: Record<string, boolean>;
};

export function AppSidebar({ user, allowedModules, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [tapePlantOpen, setTapePlantOpen] = useState(pathname.startsWith("/dashboard/production/tape-plant"));
  const [loomOpen, setLoomOpen] = useState(pathname.startsWith("/dashboard/production/loom"));
  const [laminationOpen, setLaminationOpen] = useState(pathname.startsWith("/dashboard/production/lamination"));
  const [printingOpen, setPrintingOpen] = useState(pathname.startsWith("/dashboard/production/printing"));
  const [convertexOpen, setConvertexOpen] = useState(pathname.startsWith("/dashboard/production/convertex"));
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/dashboard/settings"));
  const [dataCentreOpen, setDataCentreOpen] = useState(pathname.startsWith("/dashboard/data-centre"));

  const [currentSearch, setCurrentSearch] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentSearch(window.location.search);
    }
  }, [pathname]);

  const activeTabInUrl = (currentSearch ? new URLSearchParams(currentSearch).get("tab") : null) || "planning";

  // Super Admin bypass
  const roleName = user?.role?.name || user?.role;
  const isSuperAdmin = Boolean(
    roleName &&
    (roleName === "Super Admin" ||
      roleName === "SuperAdmin" ||
      roleName === "SUPER_ADMIN" ||
      roleName === "SUPERADMIN")
  );
  const hasSettingsAccess = isSuperAdmin || Boolean(allowedModules["SETTINGS"]);
  const hasDataCentreAccess = isSuperAdmin || Boolean(allowedModules["DATA_CENTRE"]);
  const hasTapePlantAccess = isSuperAdmin || Boolean(allowedModules["TAPE_PLANT"]);
  const hasLoomAccess = isSuperAdmin || Boolean(allowedModules["LOOM"]);
  const hasLaminationAccess = isSuperAdmin || Boolean(allowedModules["LAMINATION"]) || Boolean(allowedModules["PRODUCTION"]);
  const hasPrintingAccess = isSuperAdmin || Boolean(allowedModules["PRINTING"]) || Boolean(allowedModules["PRODUCTION"]);
  const hasConvertexAccess = isSuperAdmin || Boolean(allowedModules["CONVERTEX"]) || Boolean(allowedModules["PRODUCTION"]);

  const visibleNavItems = navItems.filter(
    (item) => (!item.module || isSuperAdmin || allowedModules[item.module]),
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
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                render={<Link href={item.url} />}
                isActive={pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url + "/"))}
                tooltip={item.title}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          {hasTapePlantAccess && (
            <Collapsible open={tapePlantOpen} onOpenChange={setTapePlantOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip="Tape Plant" />}>
                    <Layers className="h-4 w-4" />
                    <span>Tape Plant</span>
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {tapePlantItems.map((subItem) => {
                      const subTab = subItem.url.split("tab=")[1];
                      const isSubActive = pathname === "/dashboard/production/tape-plant" && activeTabInUrl === subTab;
                      return (
                        <SidebarMenuSubItem key={subItem.url}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} onClick={() => setCurrentSearch(`?tab=${subTab}`)} />}
                            isActive={isSubActive}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {hasLoomAccess && (
            <Collapsible open={loomOpen} onOpenChange={setLoomOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip="Loom Section" />}>
                    <Grid className="h-4 w-4" />
                    <span>Loom Section</span>
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {loomItems.map((subItem) => {
                      const subTab = subItem.url.split("tab=")[1];
                      const isSubActive = pathname === "/dashboard/production/loom" && activeTabInUrl === subTab;
                      return (
                        <SidebarMenuSubItem key={subItem.url}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} onClick={() => setCurrentSearch(`?tab=${subTab}`)} />}
                            isActive={isSubActive}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {hasLaminationAccess && (
            <Collapsible open={laminationOpen} onOpenChange={setLaminationOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip="Lamination" />}>
                    <Film className="h-4 w-4" />
                    <span>Lamination</span>
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {laminationItems.map((subItem) => {
                      // For the base lamination URL, only match exactly to prevent
                      // highlighting "Production Report" when on /summary, /wastage, etc.
                      const isBaseUrl = subItem.url === "/dashboard/production/lamination";
                      const isSubActive = isBaseUrl
                        ? pathname === subItem.url
                        : pathname === subItem.url || pathname.startsWith(subItem.url + "/");
                      return (
                        <SidebarMenuSubItem key={subItem.url}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} />}
                            isActive={isSubActive}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {hasPrintingAccess && (
            <Collapsible open={printingOpen} onOpenChange={setPrintingOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip="Printing" />}>
                    <Printer className="h-4 w-4" />
                    <span>Printing</span>
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {printingItems.map((subItem) => {
                      const isBaseUrl = subItem.url === "/dashboard/production/printing";
                      const isSubActive = isBaseUrl
                        ? pathname === subItem.url
                        : pathname === subItem.url || pathname.startsWith(subItem.url + "/");
                      return (
                        <SidebarMenuSubItem key={subItem.url}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} />}
                            isActive={isSubActive}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          {hasConvertexAccess && (
            <Collapsible open={convertexOpen} onOpenChange={setConvertexOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton tooltip="Convertex" />}>
                    <Scissors className="h-4 w-4" />
                    <span>Convertex</span>
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {convertexItems.map((subItem) => {
                      const isBaseUrl = subItem.url === "/dashboard/production/convertex";
                      const isSubActive = isBaseUrl
                        ? pathname === subItem.url
                        : pathname === subItem.url || pathname.startsWith(subItem.url + "/");
                      return (
                        <SidebarMenuSubItem key={subItem.url}>
                          <SidebarMenuSubButton
                            render={<Link href={subItem.url} />}
                            isActive={isSubActive}
                          >
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

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
