"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Users,
  ShieldCheck,
  PackageSearch,
  Factory,
  CheckCircle,
  Truck,
  Building2,
  ChevronDown,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Security & Gate", url: "/dashboard/gate", icon: ShieldCheck },
  { title: "Inventory", url: "/dashboard/inventory", icon: PackageSearch },
  { title: "Production", url: "/dashboard/production", icon: Factory },
  { title: "Quality Control", url: "/dashboard/quality", icon: CheckCircle },
  { title: "Dispatch", url: "/dashboard/dispatch", icon: Truck },
];

const settingsItems = [
  { title: "General Settings", url: "/dashboard/settings" },
  { title: "Users & Roles", url: "/dashboard/settings/users" },
  { title: "Branches & Locations", url: "/dashboard/settings/branches" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-border/50 bg-white shadow-sm transition-all duration-300" variant="inset" collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/50 bg-white overflow-hidden transition-all duration-300">
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold w-full">
          <div className="flex shrink-0 items-center justify-center rounded-md hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Flexicom Logo" width={32} height={32} className="object-contain" />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0">
            <span className="text-lg font-bold text-primary leading-tight">Flexicom</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">ERP System</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                render={<Link href={item.url} />}
                isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                tooltip={item.title}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          <Collapsible defaultOpen={pathname.startsWith("/dashboard/settings")} className="group/collapsible">
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
                    <AvatarFallback className="rounded-xl bg-gradient-brand text-white text-xs font-bold">AD</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden transition-all duration-300 opacity-100 group-data-[collapsible=icon]:opacity-0">
                    <span className="truncate font-semibold text-primary">Admin User</span>
                    <span className="truncate text-xs text-muted-foreground">admin@plexierp.com</span>
                  </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">AD</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Admin User</span>
                      <span className="truncate text-xs text-muted-foreground">admin@plexierp.com</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
