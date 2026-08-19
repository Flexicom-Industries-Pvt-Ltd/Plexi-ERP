import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6">
      <div className="bg-red-100 p-6 rounded-full dark:bg-red-900/20">
        <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-500" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground max-w-[500px] mx-auto text-lg">
          You don't have the required permissions to view this page or perform this action.
        </p>
      </div>
      <Link 
        href="/dashboard" 
        className={buttonVariants({ variant: "default", className: "bg-[#2d2f83] hover:bg-[#2d2f83]/90 mt-4" })}
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
