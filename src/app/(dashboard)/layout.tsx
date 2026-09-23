import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BreadcrumbProvider } from "@/components/layout/breadcrumb-context";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { getAuthenticatedUserWithRole } from "@/lib/permissions";
import { isSuperAdminRole } from "@/lib/api-auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUserWithRole();
  if (!user || !user.isActive) {
    redirect("/auth/login");
  }

  const allowedModules: Record<string, boolean> = {};
  if (user.role?.permissions) {
    user.role.permissions.forEach((p) => {
      allowedModules[p.module] = p.canRead;
    });
  }

  return (
    <SidebarProvider>
      <BreadcrumbProvider>
        <AppSidebar user={user} allowedModules={allowedModules} />
        <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-hidden bg-background">
          <AppHeader />
          <main className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-3 pb-6 md:p-6 md:pb-6 bg-secondary/30">
            <div className="mx-auto max-w-7xl w-full min-w-0 h-full">
              {children}
            </div>
          </main>
        </div>
      </BreadcrumbProvider>
    </SidebarProvider>
  );
}
