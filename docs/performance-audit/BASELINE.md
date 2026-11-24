# Plexi-ERP — Complete Performance Baseline Measurement

**Audit Date**: November 2026  
**Environment**: PostgreSQL (Neon Cloud / Local Instance) + Next.js 16.3.3 (App Router)  
**Target Load**: 30–50 concurrent active factory users (headroom for 100 concurrent)  
**Baseline Commit**: `f0d6b7fa4a891e151d31d38321b782e90f81bb7d`

---

## 1. Executive Summary of Baseline State

| Metric Category | Baseline Value | Target Post-Optimization | Health Status |
| :--- | :--- | :--- | :--- |
| **Database Total Storage** | 27.0 MB | Optimized growth rate | Good |
| **Index Hit Ratio** | 83.63% | > 99.00% | ⚠️ Degraded |
| **Top Seq Scan Tuples Read** | 2,503,852 rows (`RolePermission`) | < 10,000 rows | ❌ Critical Bottleneck |
| **Total Client JS Bundle** | 9.08 MB (chunks) | < 6.0 MB | ⚠️ Heavy |
| **Largest Single Chunk** | 2.41 MB (`@scalar/api-reference`) | Lazy loaded (< 50 KB initial) | ❌ Critical Bottleneck |
| **N+1 Query Hotspots** | 13 confirmed loop patterns | 0 loop queries | ❌ Critical Bottleneck |
| **Unbounded findMany Queries** | 372 call sites without `take` | Bounded pagination on all APIs | ⚠️ High Risk |
| **Deep Relation Includes** | 60 queries with depth > 2 | Flattened / targeted select | ⚠️ Moderate Risk |
| **User Authorization Overhead** | 3 DB queries per request | 0 DB queries (L1 memoized) | ❌ High Overhead |

---

## 2. PostgreSQL Live Storage & Table Statistics

Measurements captured via `pg_database_size`, `pg_stat_user_tables`, and `pg_statio_user_tables`:

### 2.1 Storage by Relation (Top 15 Tables)

| Table Name | Total Size | Data Size | Index Size | Live Rows | Dead Rows | Bloat % |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LogEntry` | 4,376 kB | 2,272 kB | 2,104 kB | 1,711 | 56 | ~2.5% |
| `LogDiff` | 1,608 kB | 1,392 kB | 216 kB | 742 | 89 | ~6.0% |
| `TapePlantTemperatureReading` | 1,264 kB | 40 kB | 1,224 kB | 82 | 0 | 0.0% |
| `LoomReadingEntry` | 560 kB | 144 kB | 416 kB | 277 | 0 | 0.0% |
| `GateStatusLog` | 504 kB | 232 kB | 272 kB | 1,125 | 51 | ~4.5% |
| `AuditLog` | 368 kB | 208 kB | 160 kB | 332 | 0 | 0.0% |
| `ProductionRoll` | 280 kB | 72 kB | 208 kB | 105 | 8 | ~7.0% |
| `TapePlantPlan` | 248 kB | 128 kB | 120 kB | 58 | 12 | ~17.1% |
| `TapePlantPostProduction` | 216 kB | 112 kB | 104 kB | 10 | 30 | ~75.0% |
| `GateEntry` | 200 kB | 48 kB | 152 kB | 140 | 5 | ~3.4% |
| `FinishedGoodsLot` | 160 kB | 8 kB | 152 kB | 1 | 1 | ~50.0% |
| `TapePlantRecipe` | 160 kB | 16 kB | 144 kB | 38 | 11 | ~22.4% |
| `LoomReadingSheet` | 144 kB | 24 kB | 120 kB | 5 | 27 | ~84.3% |
| `LoomMachineMapping` | 144 kB | 16 kB | 128 kB | 46 | 27 | ~37.0% |
| `RolePermission` | 128 kB | 16 kB | 112 kB | 117 | 0 | 0.0% |

### 2.2 Sequential Scans vs Index Scans (Severe Index Deficiencies)

| Table Name | Sequential Scans | Tuples Read via Seq Scan | Index Scans | Tuples Fetched via Index | Bottleneck Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `RolePermission` | 24,398 | 2,503,852 | 892 | 5,821 | **CRITICAL** (Missing composite index) |
| `GateEntry` | 15,306 | 887,976 | 2,421 | 22,745 | **CRITICAL** (Missing filter indexes) |
| `Role` | 21,131 | 349,903 | 4,934 | 5,053 | **HIGH** (Uncached session lookups) |
| `TapePlantTemperatureReading` | 6,013 | 320,653 | 56 | 40 | **HIGH** (Missing compound telemetry index) |
| `TapePlantPlan` | 6,779 | 120,524 | 21,272 | 28,405 | **HIGH** (Missing index on `date`) |
| `LogEntry` | 598 | 109,537 | 2,805 | 26,321 | **MEDIUM** (Missing module/timestamp index) |
| `User` | 26,755 | 72,738 | 2,340 | 2,384 | **HIGH** (Uncached auth verification) |
| `Driver` | 625 | 58,290 | 459 | 182 | **MEDIUM** (Missing search index) |
| `LoomMachineMapping` | 1,129 | 47,166 | 81 | 54 | **MEDIUM** (Missing qualityCode index) |
| `TruckStockDetail` | 3,822 | 45,866 | 235 | 235 | **MEDIUM** (Missing gateEntryId index) |

---

## 3. Frontend Bundle Baseline

Compiled using Next.js 16.3.3 Production Build (`webpack`):

- **Total JavaScript Client Chunks**: **9.08 MB**
- **Initial Vendor Chunk (`5223-*.js`)**: **2.41 MB** (`@scalar/api-reference-react` statically imported)
- **Top Route Chunk (`dashboard/production/loom/page-*.js`)**: **494.6 KB**
- **Second Route Chunk (`dashboard/production/tape-plant/page-*.js`)**: **435.4 KB**
- **Core Framework Chunk (`framework-*.js`)**: **185.2 KB**

### Core Page Bundle Sizes:
| Route | Initial JS | First Load JS | Re-render Overhead |
| :--- | :--- | :--- | :--- |
| `/auth/login` | 84 KB | 172 KB | Low |
| `/dashboard` | 142 KB | 285 KB | Moderate (multiple cards) |
| `/dashboard/production/loom` | 495 KB | 924 KB | High (dense tables) |
| `/dashboard/production/tape-plant` | 435 KB | 884 KB | High (photo modals, drive dials) |
| `/dashboard/api-docs` | 2.41 MB | 2.85 MB | Extremely High (Scalar un-split) |
| `/dashboard/gate` | 128 KB | 264 KB | Moderate |
| `/dashboard/inventory` | 185 KB | 340 KB | Moderate |

---

## 4. API Response Time & Throughput Baseline

Measured locally against simulated factory load (30 concurrent virtual users):

| Endpoint | Method | Baseline p50 | Baseline p95 | Baseline p99 | Queries per Req |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/[...nextauth]` | POST | 185 ms | 340 ms | 510 ms | 3 |
| `/api/gate` (List entries) | GET | 210 ms | 460 ms | 720 ms | 4 |
| `/api/inventory/items` | GET | 175 ms | 390 ms | 580 ms | 3 |
| `/api/inventory/dashboard` | GET | 340 ms | 780 ms | 1,250 ms | 9 (N+1 subqueries) |
| `/api/production/loom/summary` | GET | 290 ms | 680 ms | 1,100 ms | 7 |
| `/api/production/tape-plant/planning` | GET | 260 ms | 580 ms | 950 ms | 5 |
| `/api/production/realtime/stream` | GET (SSE) | 45 ms | 95 ms | 160 ms | 2 |
| `/api/hr/attendance` | GET | 310 ms | 720 ms | 1,180 ms | 6 |
| `/api/stocks` | GET | 195 ms | 420 ms | 680 ms | 3 |

---

## 5. FinOps & Resource Baseline

### 5.1 Vercel Invocations & Duration
- **Function Execution Time**: Average 240 ms per API route call.
- **Serverless Cold-Start Overhead**: 1,200 ms – 1,800 ms per new worker container.
- **Memory Allocated**: 1,024 MB per function execution.

### 5.2 Neon Serverless Compute
- **Active Compute Hours**: Current query patterns keep compute active continuously during factory operating hours (07:00 – 21:00).
- **Scale-to-Zero Blockers**: Background polling (`/api/cron/biometric-sync`) every 5 minutes prevents Neon compute from entering scale-to-zero suspend state.
- **Storage Growth Rate**: ~15 MB/month baseline, projected to expand to ~180 MB/year under standard production logging.
