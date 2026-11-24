# Plexi-ERP Comprehensive Issue Register

| Issue ID | Severity | File & Line | Root Cause | Business Impact | Remediation Status |
|---|---|---|---|---|---|
| **ERP-001** | P0 | `src/lib/permissions.ts:77-84` | Stale JWT session permissions return `true` before querying database or checking active status | Deactivated employee retains read/write access until JWT token expires | CONFIRMED / READY |
| **ERP-002** | P0 | `src/lib/production/inventory-tx.ts:75-83` | Read-calculate-write pattern (`item.currentStock - movement.quantity`) without atomic update or row lock | Concurrent stock deductions cause lost updates and incorrect ledger balances | CONFIRMED / READY |
| **ERP-003** | P0 | `src/lib/idempotency.ts:47-78` | Non-atomic `cache.get()` followed by `cache.set()` lock acquisition | Concurrent double-clicks or retries can bypass processing lock and execute duplicate mutations | CONFIRMED / READY |
| **ERP-004** | P1 | `src/lib/idempotency.ts:46` | Unscoped key `idempotency:${key}` without user ID or endpoint scoping | Cross-user key collisions and false idempotency replay responses | CONFIRMED / READY |
| **ERP-005** | P0 | `src/lib/production/inventory-tx.ts:103-107` | Batch decrement updates quantity without ensuring `batch.quantity >= movement.quantity`; missing batch skipped silently | Batch inventories can become negative; physical vs ERP batch discrepancy | CONFIRMED / READY |
| **ERP-006** | P1 | `src/lib/concurrency-lock.ts:6` | Map-based lock is process-local; does not provide cross-instance protection | Concurrent multi-node or multi-instance deployments could race | CONFIRMED / READY |
| **ERP-007** | P1 | `src/lib/concurrency-lock.ts:35` | `locks.get(key) === nextLock` check is never true because stored value is `currentLock.then(...)` | Memory leak: lock Map entries are never deleted | CONFIRMED / READY |
| **ERP-008** | P1 | `src/lib/safe-action.ts:53-57` | Raw `error.message` returned directly to client on unexpected internal exceptions | Internal database details and system stack traces leaked to client | CONFIRMED / READY |
| **ERP-009** | P2 | `src/auth.ts:166,188` | Simulated `durationMs: Math.floor(Math.random() * ...)` in audit event logging | Fabricated latency metrics obscure real auth performance | CONFIRMED / READY |
| **ERP-010** | P1 | `src/lib/rbac.ts:34`, `src/lib/permissions.ts:69` | `System Admin` in `rbac.ts` vs `Super Admin` in `permissions.ts` and `api-auth.ts` | Inconsistent admin bypass logic across modules | CONFIRMED / READY |
| **ERP-011** | P0 | `src/app/api/hr/webhook/punch/route.ts:14` | Inbound punch webhook has zero authentication check (no secret or signature) | Anyone can send fake attendance punches to production | CONFIRMED / READY |
| **ERP-012** | P0 | `src/app/api/production/realtime/stream/route.ts:10` | Real-time SSE endpoint lacks session authentication check | Unauthorized users can subscribe to live factory production events | CONFIRMED / READY |
| **ERP-013** | P0 | `src/app/api/cron/biometric-sync/route.ts:14` | Poller endpoint has no authorization or cron secret validation | Unauthorized third parties can trigger sync operations | CONFIRMED / READY |
| **ERP-014** | P2 | `src/lib/cache.ts:15` | `MemoryCacheManager` documented as distributed cache but is process-local | Cache keys not shared across instances | CONFIRMED / READY |
| **ERP-015** | P1 | `src/lib/queue/task-queue.ts:32` | In-memory `Map` task queue loses queued jobs on server restart | Long-running export or report tasks vanish on deploy/restart | CONFIRMED / READY |
| **ERP-016** | P1 | `electron/main.js:90` | `webPreferences.sandbox: false` | Renderer process runs without Chromium sandbox isolation | CONFIRMED / READY |
| **ERP-017** | P1 | `electron/main.js:139` | `!url.includes("vercel.app")` uses substring match | Malicious domains containing substring could be opened inside electron | CONFIRMED / READY |
| **ERP-018** | P0 | `src/services/inventory.service.ts:265` | Manual stock adjustment updates currentStock directly without atomic lock | Concurrent adjustments cause lost updates | CONFIRMED / READY |
| **ERP-019** | P2 | `src/lib/rate-limit.ts:24` | In-memory rate limiting is process-local | Rate limits reset on restart and do not aggregate across nodes | CONFIRMED / READY |
| **ERP-020** | P1 | `src/lib/s3.ts:11,44` | Dummy credentials in default configuration; assumes public bucket for all files | Evidence documents and photos accessible if bucket permissions misconfigured | CONFIRMED / READY |
| **ERP-021** | P2 | `.github/workflows/ci.yml` | CI build runs without explicit separate lint stage | Lint errors could slip into main branch | CONFIRMED / READY |
| **ERP-022** | P1 | `src/lib/db.ts:29` | Hardcoded `PrismaNeon` WebSocket adapter prevents standard Postgres on VPS | Cannot run against standard PostgreSQL on VPS without code changes | CONFIRMED / READY |
| **ERP-023** | P1 | `src/lib/queue/task-queue.ts:74` | Async microtask processing queue can drop pending tasks if concurrent enqueues collide | Background jobs could remain stuck in PENDING status | CONFIRMED / READY |
| **ERP-024** | P0 | `src/lib/hr/timewatch-client.ts:12` | Hardcoded fallback API key `T!meW@tch#123@` in runtime source | Leaked credential in source code | CONFIRMED / READY |
| **ERP-025** | P0 | `src/lib/hr/timewatch-client.ts:105`, `cron/.../route.ts:25` | Simulated mock factory punches generated on device failure and inserted into DB | Production attendance poisoned with fake employee punches | CONFIRMED / READY |
| **ERP-026** | P0 | `src/app/api/cron/shift-digest/route.ts:7`, `prune-logs/route.ts:9` | Fails open when `CRON_SECRET` is unset; shift-digest has no auth | Cron endpoints publicly accessible without authentication | CONFIRMED / READY |
| **ERP-027** | P0 | `src/actions/master-data.ts:15`, `users.ts:13`, `roles.ts:8` | Master data, user, and role server actions lack `requirePermission` enforcement | Direct action invocation bypasses page-level RBAC | CONFIRMED / READY |
| **ERP-028** | P0 | `src/lib/permissions.ts:43` | Fallback user object in `getAuthenticatedUserWithRole` explicitly sets `isActive: true` | Inactive user treated as active if database check fails | CONFIRMED / READY |
| **ERP-029** | P1 | `src/app/api/jobs/export/route.ts:21` | Accepts arbitrary export types without checking module export permission | Users can export audit logs or reports without export permissions | CONFIRMED / READY |
| **ERP-030** | P1 | `src/app/api/jobs/[id]/route.ts:22` | No ownership or admin check on job retrieval | Any user can poll and download another user's export results | CONFIRMED / READY |
| **ERP-031** | P1 | `src/app/api/production/realtime/stream/route.ts:10` | No module or factory-level subscription permission checks | Operators can stream sensitive data from other departments | CONFIRMED / READY |
| **ERP-032** | P1 | `electron/main.js:198` | `ipcMain.handle("set-server-url")` has no sender frame validation or URL whitelist | Untrusted web page could redirect Electron app to arbitrary URL | CONFIRMED / READY |
| **ERP-033** | P0 | `src/lib/permissions.ts:88` | `isActive` check placed AFTER Super Admin bypass and JWT permission bypass | Deactivated administrators or employees retain full access | CONFIRMED / READY |
| **ERP-034** | P2 | `src/lib/realtime/production-bus.ts:28` | Local EventEmitter production bus does not synchronize across instances | Multi-instance setup does not broadcast events across nodes | CONFIRMED / READY |
| **ERP-035** | P1 | `prisma/schema.prisma` | Critical financial & inventory quantities stored as `Float` instead of `Decimal` | Floating point rounding errors could accumulate over time | CONFIRMED / READY |
| **ERP-036** | P1 | `prisma/schema.prisma` | Cascade delete on certain relations could unintentionally purge historical audit trails | Risk of orphaned or deleted historical manufacturing records | CONFIRMED / READY |
| **ERP-037** | P1 | `package.json:10` | `npm run build` runs `prisma migrate deploy` during compilation | Build step requires live database; risk of accidental migrations on preview | CONFIRMED / READY |
| **ERP-038** | P2 | `next.config.ts` | Missing Content Security Policy (CSP) headers | Potential XSS risk if third-party scripts injected | CONFIRMED / READY |
| **ERP-039** | P2 | `next.config.ts` | PWA cache might cache sensitive user-specific data offline | Shared device could expose cached data to unauthorized user | CONFIRMED / READY |
| **ERP-040** | P0 | `src/auth.ts:27-68` | `authorize()` credential handler does not check `user.isActive` | Deactivated user can log in and obtain valid JWT token | CONFIRMED / READY |
| **ERP-041** | P2 | Repository | Confidential manufacturing formulas and enterprise logic in public repository | Intellectual property exposure risk | CONFIRMED / READY |
| **ERP-042** | P2 | `src/services/*` | Multi-factory tenant isolation not strictly enforced by factory ID | Users in Plant A can see Plant B records | CONFIRMED / READY |
