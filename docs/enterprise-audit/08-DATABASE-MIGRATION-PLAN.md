# Plexi-ERP Database Migration & Schema Plan

## 1. Decoupling Migrations from Compilation Builds
- **Defect (ERP-037)**: `package.json` currently executes `node scripts/migrate-if-database-url.mjs` as part of `npm run build`.
- **Remediation**:
  - Remove `migrate-if-database-url.mjs` from the `build` script.
  - Expose a dedicated migration command: `"db:migrate:deploy": "prisma migrate deploy"`.
  - In CI/CD pipelines, migrations are run in an explicit, isolated migration phase, ensuring builds are pure and non-destructive.

## 2. Float vs Decimal Field Classification
- **Current State**: High-volume measurements and weights are stored as `Float` in Prisma (`currentStock`, `quantity`, `reservedStock`).
- **Precision Assessment**:
  - Industrial manufacturing scales produce floating-point kilogram measurements with 2 to 3 decimal places (e.g. `124.55 kg`).
  - Storing as `Float` is appropriate for physical machine measurements, but calculations must be rounded consistently using `Math.round((val + Number.EPSILON) * 100) / 100`.
  - Financial invoices and ledger balance reconciliation should use fixed decimals.
  - Zero-regression rule: Schema migrations converting `Float` to `Decimal` require explicit staging data validation before production rollout.

## 3. Database Adapter Architecture
- Support both Neon Serverless (WebSocket/fetch pool) and standard PostgreSQL (`@prisma/adapter-pg` or native Prisma connection) seamlessly based on `DATABASE_URL`.
