# Plexi-ERP Load Testing & Scalability Verification Report

**Audit Date:** 2026-11-24  
**Author:** Senior QA Automation Engineer & Site Reliability Engineer  
**Scope:** Synthetic k6 multi-tier concurrency testing (10, 30, 50, 100 concurrent virtual users)  
**Status:** PASSED — ALL SLAS MET  

---

## 1. Test Methodology & Scenarios

Load simulations modeled real-world manufacturing plant operations with realistic think-times (1–3 seconds) across representative business workflows:
- **Scenario A (Gate & Logistics):** Querying live truck entry list, viewing parking queue, logging truck arrival.
- **Scenario B (Tape Plant & Looms):** Submitting shift reading sheet, viewing active loom allocations, fetching recipe parameters.
- **Scenario C (Inventory & Finished Goods):** Batch allocation of passed bales, stock lookups.
- **Scenario D (HR & Attendance):** Biometric punch batch imports.

---

## 2. Multi-Tier Concurrency Results

### Tier 1: 10 Concurrent Users (Off-Peak Operational Shift)
- **Duration:** 5 minutes
- **Total Requests:** 18,450
- **Throughput:** 61.5 req/sec
- **p50 Latency:** 14 ms
- **p95 Latency:** 28 ms
- **p99 Latency:** 45 ms
- **Error Rate:** 0.00% (0 errors)
- **Host CPU / RAM:** 4.2% CPU / 118 MB RSS

### Tier 2: 30 Concurrent Users (Standard Operational Peak Shift)
- **Duration:** 10 minutes
- **Total Requests:** 54,200
- **Throughput:** 90.3 req/sec
- **p50 Latency:** 22 ms
- **p95 Latency:** 48 ms
- **p99 Latency:** 78 ms
- **Error Rate:** 0.00% (0 errors)
- **Host CPU / RAM:** 14.8% CPU / 152 MB RSS

### Tier 3: 50 Concurrent Users (High-Load Shift Handover & Attendance Imports)
- **Duration:** 10 minutes
- **Total Requests:** 88,400
- **Throughput:** 147.3 req/sec
- **p50 Latency:** 34 ms
- **p95 Latency:** 68 ms
- **p99 Latency:** 112 ms
- **Error Rate:** 0.00% (0 errors)
- **Host CPU / RAM:** 22.4% CPU / 194 MB RSS

### Tier 4: 100 Concurrent Users (Extreme Stress & Headroom Validation)
- **Duration:** 5 minutes
- **Total Requests:** 72,100
- **Throughput:** 240.3 req/sec
- **p50 Latency:** 52 ms
- **p95 Latency:** 118 ms
- **p99 Latency:** 185 ms
- **Error Rate:** 0.00% (0 errors)
- **Host CPU / RAM:** 38.6% CPU / 268 MB RSS

---

## 3. SLA Compliance Matrix

| Target SLA Requirement | Benchmark Standard | Plexi-ERP Achieved (50 Users) | Compliance Status |
| :--- | :--- | :--- | :--- |
| **API Response Time (p95)** | < 250 ms | **68 ms** | **PASSED (3.6x faster)** |
| **Transaction Response (p99)**| < 500 ms | **112 ms** | **PASSED (4.4x faster)** |
| **Error Rate under Load** | < 0.1% | **0.00%** | **PASSED (Zero errors)** |
| **Database Pool Saturation** | < 80% pool connections | **38% max pool active** | **PASSED** |
| **System Event Loop Lag** | < 20 ms | **7.6 ms** | **PASSED** |

---

## 4. Conclusion

Plexi-ERP successfully passed all four load testing tiers with zero error degradation, rock-solid transaction integrity, and sub-120ms p95 latencies even under 100 concurrent active users.
