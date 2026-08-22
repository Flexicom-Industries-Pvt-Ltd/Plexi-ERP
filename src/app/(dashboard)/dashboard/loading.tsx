import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-[280px] rounded-lg bg-primary/10" />
        <Skeleton className="h-5 w-[420px] max-w-full rounded-md bg-muted/60" />
      </div>

      {/* Main Content Area Skeleton (Toolbar + Table) */}
      <div className="flex flex-col gap-4 mt-2">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-[240px] rounded-xl bg-white/60 border border-border/40" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[110px] rounded-xl bg-white/60 border border-border/40" />
            <Skeleton className="h-10 w-[140px] rounded-xl bg-primary/20" />
          </div>
        </div>

        {/* Table/Card Grid */}
        <div className="rounded-xl border border-border/40 bg-white/50 p-4 space-y-4 shadow-sm">
          {/* Table Header */}
          <div className="flex gap-4 border-b border-border/40 pb-4">
             <Skeleton className="h-6 w-full rounded-md bg-muted/50" />
          </div>
          
          {/* Table Rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="h-14 w-full rounded-lg bg-muted/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
