"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import React from "react";

export function AppHeader() {
  const pathname = usePathname();
  
  // Basic breadcrumb generation based on path
  const paths = pathname.split("/").filter(Boolean);
  
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-white/70 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <div className="mr-2 h-4 w-px bg-border" />
      
      <Breadcrumb>
        <BreadcrumbList>
          {paths.map((path, index) => {
            const href = "/" + paths.slice(0, index + 1).join("/");
            const isLast = index === paths.length - 1;
            const title = path.charAt(0).toUpperCase() + path.slice(1);
            
            return (
              <React.Fragment key={path}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
