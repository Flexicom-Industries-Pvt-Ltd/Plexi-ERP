# Plexi-ERP Enterprise Audit — Baseline & Initial State

**Repository**: `Flexicom-Industries-Pvt-Ltd/Plexi-ERP`  
**Audit Date**: November 24, 2026  
**Auditor Role**: Combined Enterprise Engineering Taskforce (CTO, Principal Architect, Security, QA, Manufacturing Specialist)  
**Baseline Git Commit**: `50ebd4a` (`origin/dev`)  
**Remediation Branch**: `feat/hardening/enterprise-zero-regression`  
**GitHub Task Issue**: [#1192](https://github.com/Flexicom-Industries-Pvt-Ltd/Plexi-ERP/issues/1192) on Org Project 4 (`Plexi-ERP (#4)`)

---

## 1. Initial Test & Code Quality Baseline

| Verification Check | Tool / Runner | Result | Notes |
|---|---|---|---|
| **Prisma Generation** | `npx prisma generate` | **PASSED** | Generated Prisma Client v7.10.0 to `./src/generated/prisma` in 1.33s |
| **Unit & Integration Tests** | `npx vitest run` | **77 passed (77)**<br>**459 tests passed (459)** | Duration: 263.83s. Zero test failures. Full suite green. |
| **TypeScript Compilation** | `npx tsc --noEmit` | **0 ERRORS** | TypeScript 5.8+ type check exited with exit code 0. |
| **ESLint Static Analysis** | `npm run lint` | **0 ERRORS**<br>(268 warnings) | Unused variables and legacy require warnings in Electron scripts. Clean build. |
| **First-Party Source Files** | Custom inventory | **679 files** | Core Next.js App Router, services, components, Electron shell, Prisma schema. |

---

## 2. Characterization of Baseline Systems

- **Next.js & React**: Next.js 16.3.3 App Router, React 19.2.8.
- **Database & ORM**: PostgreSQL (Neon Serverless in production), Prisma 7.10.0 with `@prisma/adapter-neon`.
- **Desktop Shell**: Electron 39 frameless custom titlebar application.
- **Real-Time Synchronization**: Server-Sent Events (SSE) via `src/lib/realtime/production-bus.ts`.
- **Background Processing**: Process-local `TaskQueueEngine` (`src/lib/queue/task-queue.ts`).
- **Caching**: Process-local `MemoryCacheManager` (`src/lib/cache.ts`).

---

## 3. Confirmed External Audit Vulnerabilities (ERP-001 - ERP-042)

All 42 external audit items have been independently analyzed against the codebase. Key high-severity vulnerabilities confirmed include:
1. **ERP-001 & ERP-033**: Stale JWT permissions survive authorization lookup failures; inactive accounts bypass checks due to early returns on cached JWT permissions.
2. **ERP-002 & ERP-005**: Inventory lost-update concurrency risks and negative batch quantity risks in `src/lib/production/inventory-tx.ts`.
3. **ERP-003 & ERP-004**: Non-atomic and unscoped idempotency keys in `src/lib/idempotency.ts`.
4. **ERP-007**: Broken promise reference comparison in `src/lib/concurrency-lock.ts` causing permanent memory leak.
5. **ERP-008**: Raw internal server exception leakage in `src/lib/safe-action.ts`.
6. **ERP-009**: Fabricated authentication duration timing (`Math.random()`) in `src/auth.ts`.
7. **ERP-010**: Inconsistent admin role name checks across `src/lib/rbac.ts` and `src/lib/permissions.ts`.
8. **ERP-011 & ERP-013**: Missing webhook authentication on `/api/hr/webhook/punch` and missing cron secret validation on `/api/cron/shift-digest` and `/api/cron/biometric-sync`.
9. **ERP-016 & ERP-017 & ERP-032**: Disabled Electron sandbox, permissive URL regex/substring matching, and unvalidated IPC server URL setters.
10. **ERP-024 & ERP-025**: Hardcoded biometric fallback API key and simulated biometric punches silently accepted and inserted into production database records.
11. **ERP-027**: Missing server action authorization in `src/actions/master-data.ts`, `users.ts`, and `roles.ts`.
12. **ERP-037**: Database migrations tightly coupled to application build command in `package.json`.
