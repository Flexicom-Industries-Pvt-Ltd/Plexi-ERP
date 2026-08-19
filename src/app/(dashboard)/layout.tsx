import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
// Assuming auth checks are done in middleware or within the page, 
// but we can import requireAuth if needed.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-secondary/30">
          <div className="mx-auto max-w-7xl h-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
