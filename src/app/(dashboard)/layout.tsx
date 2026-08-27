import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email as string },
    include: { role: { include: { permissions: true } } },
  });

  const allowedModules: Record<string, boolean> = {};
  if (user?.role?.permissions) {
    user.role.permissions.forEach(p => {
      allowedModules[p.module] = p.canRead;
    });
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} allowedModules={allowedModules} />
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
