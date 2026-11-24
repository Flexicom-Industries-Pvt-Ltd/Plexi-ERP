# Plexi-ERP Regression Verification Matrix

| Area | Contract / Invariant | Baseline Test | Target Verification |
|---|---|---|---|
| **Tape Plant** | Denier = (W * 9000) / L; formula percentage sum = 100% | `day-night-planning.test.ts`, `recipe-format.test.ts` | Zero drift in calculated denier or batch weights |
| **Loom Section** | Tubular fabric GSM = (Net Wt * 1000) / (2 * Width * Length) | `loom-summary.test.ts`, `loom-roll-stock.test.ts`, `loom-changeover.test.ts` | Preserved roll tracking & shift attribution |
| **Lamination** | Coating GSM = Laminated GSM - Base GSM; Wastage % formula | `lamination-production-report.test.ts`, `lamination-wastage.test.ts` | Preserved raw material deduction formulas |
| **Roll Tracing** | Full genealogy across Loom -> Lamination -> Printing -> Convertex | `roll-trace.test.ts` | All 4 traveler stages render & print correctly |
| **Attendance** | Shift A/B/C attribution; 45s duplicate punch window | `attendance.test.ts`, `shift-digest.service.test.ts` | No simulated punches accepted; real punches preserved |
| **Inventory** | Stock deducted = sum of movement OUT; Stock added = sum of movement IN | `inventory.service.test.ts`, `dispatch.service.test.ts` | 100% atomic consistency under concurrent operations |
| **Idempotency** | Duplicate requests with same key return cached response | `idempotency.test.ts` | No duplicate ledger entries or double bookings |
| **Desktop Shell** | Frameless titlebar, maximize/minimize/close IPC | `DesktopTitleBar.test.tsx`, `updater.test.js` | Full IPC security with sandbox enabled |
