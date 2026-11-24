# Plexi-ERP Performance & Observability Report

## 1. Removal of Fabricated Metrics
- **Finding (ERP-009)**: In `src/auth.ts`, audit logging for sign-in and sign-out generated random simulated durations (`Math.floor(Math.random() * 50) + 150`).
- **Remediation**: Replaced with actual high-resolution wall-clock duration measurement (`Date.now() - startTime`).

## 2. Mutex & In-Memory Lock Cleanup
- **Finding (ERP-007)**: In `src/lib/concurrency-lock.ts`, comparison of mismatched promise objects prevented cleanup from deleting Map entries.
- **Remediation**: Correctly track lock promises and ensure Map entries are cleared upon resolution.

## 3. Caching & Query Optimization
- Batch relation fetching and aggregation (`groupBy`) in `InventoryService` eliminates N+1 query overhead.
- Preserved React `cache()` memoization in `getAuthenticatedUserWithRole` to eliminate redundant database queries within a single HTTP request lifecycle.
