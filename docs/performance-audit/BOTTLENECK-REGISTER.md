# Plexi-ERP — Bottleneck & Defect Register

**Audit Module**: Enterprise Performance, Resource and Cost Optimization  
**Total Identified Bottlenecks**: 12 Primary Architecture Bottlenecks  

---

| ID | Category | Bottleneck Description | Root Cause | Affected Files | Severity | Target Remediation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PERF-01** | Database | 2.5M Sequential Scan Tuples on `RolePermission` | Missing composite index on `(roleId, module, canRead)` | `prisma/schema.prisma` | **CRITICAL (P0)** | Add composite index `@@index([roleId, module])` in Prisma schema |
| **PERF-02** | Database | Missing Indexes on High-Traffic Foreign Keys & Dates | Lack of explicit Prisma `@@index` on `GateEntry.status`, `TapePlantPlan.date`, `InventoryBatch.gateEntryId`, `Account.userId` | `prisma/schema.prisma` | **CRITICAL (P0)** | Add targeted indexes for high-frequency filter and join keys |
| **PERF-03** | Backend | N+1 Bale Lookup during Finished Goods Dispatch | Sequential `findUnique` inside `for (const baleId of baleIds)` | `src/services/finished-goods.service.ts` | **HIGH (P1)** | Batch query with `db.bale.findMany({ where: { id: { in: baleIds } } })` |
| **PERF-04** | Backend | N+1 Punch Duplicate Checks in Attendance Import | Sequential `findFirst` per record inside `for (const r of records)` | `src/lib/hr/attendance-import.ts`, `src/app/api/hr/attendance/route.ts` | **HIGH (P1)** | Batch load existing punches within window into Set/Map for O(1) in-memory comparison |
| **PERF-05** | Backend | Redundant Session & Permission DB Queries on Every API Call | `requireApiAuth()` queries `User`, `Role`, `RolePermission` on every request without memoization | `src/lib/api-auth.ts`, `src/lib/rbac.ts` | **HIGH (P1)** | Request-level memoization & short-lived L1 cache for verified user role permissions (60s TTL) |
| **PERF-06** | Frontend | Huge 2.46 MB Monolithic Vendor Chunk for `@scalar/api-reference` | Direct synchronous import of Scalar API Docs in `api-docs-client.tsx` | `src/app/(dashboard)/dashboard/api-docs/api-docs-client.tsx` | **CRITICAL (P0)** | Dynamic lazy loading with `next/dynamic` (`ssr: false`) to decouple from main dashboard bundles |
| **PERF-07** | Database | Unbounded `findMany` Queries in Dashboard Pages | Omission of `take` and pagination limits on master data lists | `src/app/api/data-centre/*`, `src/app/(dashboard)/dashboard/settings/*` | **MEDIUM (P2)** | Enforce default safe limit (`take: 100` or `take: 200`) across all list endpoints |
| **PERF-08** | Database | Deep Relation Includes (Depth 5–6) in Production Queries | `plan-include.ts` and `roll-include.ts` over-fetching unused columns and nested entities | `src/lib/production/plan-include.ts`, `src/lib/production/roll-include.ts` | **MEDIUM (P2)** | Prune relation trees to targeted `select` statements matching exact consumer needs |
| **PERF-09** | Memory | Unbounded In-Memory Cache in `MemoryCacheManager` | Map eviction was based only on entry count rather than TTL pruning, risking stale memory retention | `src/lib/cache.ts` | **MEDIUM (P2)** | Add periodic background TTL expiration sweep and bounded max memory cap |
| **PERF-10** | Network | Redundant Gate & Inventory Polling | Client polling `/api/gate` every 5 seconds without ETag or If-Modified-Since | `src/app/(dashboard)/dashboard/gate/page.tsx` | **MEDIUM (P2)** | Utilize TanStack Query with `staleTime: 10000` and conditional 304 response headers |
| **PERF-11** | FinOps | Neon Scale-to-Zero Blocked by 5-Minute Cron Polling | Frequent cron execution keeps Neon compute branch active 24/7 even during non-working factory hours | `src/app/api/cron/biometric-sync/route.ts` | **HIGH (P1)** | Restrict scheduled polling to active factory operating shifts (06:00–22:00 IST) or webhook-driven sync |
| **PERF-12** | Storage | Uncompressed Audit & System Logs Growing Rapidly | `LogEntry` and `LogDiff` represent >20% of database storage without archiving | `src/app/api/cron/prune-logs/route.ts`, `src/lib/db.ts` | **MEDIUM (P2)** | Add log pruning policy (>90 days) and JSON payload truncation for high-volume telemetry |
