# Plexi-ERP Enterprise Remediation Plan

## Phased Remediation Strategy (Priority Order)

### Phase 2 — Critical Security Remediation
1. **Auth & Session Hardening (`src/auth.ts`, `src/lib/permissions.ts`, `src/lib/api-auth.ts`, `src/lib/rbac.ts`)**:
   - In `authorize()`: explicitly verify `user.isActive === true`. Reject inactive users with a clear security log event.
   - In `jwt()` & `session()`: check `user.isActive` on database query and revoke session immediately if account deactivated.
   - In `src/lib/permissions.ts`: move `user.isActive` check to the top before any bypass or JWT permission check. Remove fallback `isActive: true`.
   - Normalize administrator role name checking across all modules (`Super Admin`, `System Admin`, `SuperAdmin`).
   - Remove simulated random latency durations in `src/auth.ts` (`durationMs: Math.floor(Math.random() ...)`). Replace with real measured elapsed time.

2. **Server Action & API Authorization (`src/actions/*`, `src/lib/safe-action.ts`)**:
   - Add `requirePermission` to all actions in `src/actions/master-data.ts`, `src/actions/users.ts`, `src/actions/roles.ts`.
   - In `safe-action.ts`: sanitize unexpected internal server errors in production, return generic message with correlation ID, and prevent stack trace leaks.

3. **Cron Security (`src/app/api/cron/*`)**:
   - Implement centralized `requireCronAuth()` helper:
     - Require `Authorization: Bearer <CRON_SECRET>`.
     - Fail closed: if `CRON_SECRET` is unset, reject with 401 Unauthorized.
     - Protect `/api/cron/shift-digest`, `/api/cron/biometric-sync`, `/api/cron/prune-logs`, `/api/cron/prune-photos`.

4. **Biometric Integration & Poisoning Defense (`src/lib/hr/timewatch-client.ts`, `punch/route.ts`, `biometric-sync/route.ts`)**:
   - Remove hardcoded API key from source code (`process.env.TIMEWATCH_API_KEY` required, no plaintext fallback).
   - In `TimeWatchClient`: remove fallback insertion of simulated punches. If device is unreachable, return `success: false` with clear connection error.
   - In `/api/cron/biometric-sync`: verify `!syncRes.isMock` before inserting attendance. Never insert simulated data into `db.attendancePunch`.
   - In `/api/hr/webhook/punch`: add webhook authorization token verification (`X-Webhook-Secret` or `X-Api-Key`).

5. **Jobs & Real-Time Security (`src/app/api/jobs/*`, `src/app/api/production/realtime/*`)**:
   - In `/api/jobs/export`: validate `body.type` against allowlist (`EXPORT_AUDIT_LOGS`, `EXPORT_ATTENDANCE`, `EXPORT_PRODUCTION_SUMMARY`), verify user permission for the specific module.
   - In `/api/jobs/[id]`: verify job ownership (`job.createdById === auth.user.id` or user is Admin).
   - In `/api/production/realtime/stream`: require authenticated session via `requireApiAuth({ module: Module.PRODUCTION, action: "canRead" })`.

### Phase 3 — Inventory & Database Correctness
1. **Atomic Concurrency in Inventory (`src/lib/production/inventory-tx.ts`, `src/services/inventory.service.ts`)**:
   - Replace read-calculate-write with atomic updates:
     - For `TxType.IN`: `update({ data: { currentStock: { increment: quantity } } })`.
     - For `TxType.OUT`: `updateMany({ where: { id, currentStock: { gte: quantity } }, data: { currentStock: { decrement: quantity } } })`. If `count === 0`, throw insufficient stock error.
   - For `InventoryBatch`:
     - For `OUT`: verify batch exists and has `quantity >= movement.quantity`. Use atomic decrement with `{ gte: quantity }` condition. Never silently skip missing batch.
   - Fix `InventoryService.adjustStock` to prevent concurrent lost updates.

2. **Durable Idempotency (`src/lib/idempotency.ts`)**:
   - Scope idempotency cache key by `user.id + method + pathname + key`.
   - Fix race condition in lock acquisition.

### Phase 4 — Concurrency Lock & Distributed State
1. **Fix Concurrency Lock Memory Leak (`src/lib/concurrency-lock.ts`)**:
   - Correctly track the chained promise or release handler so keys are reliably deleted from the `locks` Map when resolved.

### Phase 6 — Electron & S3 Hardening
1. **Electron (`electron/main.js`)**:
   - Enable `sandbox: true` in `webPreferences`.
   - Enforce exact-origin validation for `setWindowOpenHandler` and add `will-navigate` interception.
   - In `ipcMain.handle("set-server-url")`, validate URL scheme (`http:`, `https:`) and authorized domain pattern.

2. **AWS S3 (`src/lib/s3.ts`)**:
   - Require environment configuration for S3 credentials without hardcoded dummy fallbacks.

### Phase 10 & 11 — CI/CD & Deployment Readiness
1. **Decouple Migrations from Build**:
   - Remove `node scripts/migrate-if-database-url.mjs` from `"build"` script in `package.json`.
   - Create separate `"db:migrate:deploy"` script for explicit CI/CD deployment execution.
2. **Database Adapter Flexibility (`src/lib/db.ts`)**:
   - Support both Neon WebSocket adapter and standard PostgreSQL connection pool driven by environment.
