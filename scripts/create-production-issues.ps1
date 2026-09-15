$repo = "Flexicom-Industries-Pvt-Ltd/Plexi-ERP"
$assignee = "Debsmit16"
$project = 4
$owner = "Flexicom-Industries-Pvt-Ltd"

function New-ProductionIssue($title, $body) {
  $url = gh issue create --repo $repo --assignee $assignee --title $title --body $body
  gh project item-add $project --owner $owner --url $url | Out-Null
  Write-Output $url
}

# ─── Layer 0: Foundation ───────────────────────────────────────────────────────

New-ProductionIssue "[P19] Production: Database schema and module foundation" @"
# GitHub Task: Production database schema and module foundation

**Title**: [P19] Production: Database schema and module foundation

**Description**:
Establish the Production module foundation per PRD Phase 4 (§66 items 20–28). Introduce core Prisma models, enums, migrations, RBAC wiring, audit logging hooks, and a non-404 `/dashboard/production` shell. This unblocks all downstream production features.

**PRD refs**: §4 (module access), §28–30, §66 Phase 4

**Depends on**: Phase 3 complete (Inventory, Shifts, Machines master data exist)

**Task Pointers (Checklist)**:
- [ ] **Schema**: Add ``ProductionPhase`` enum (BOBBIN, LOOM, LAMINATION, PRINTING, CUTTING, CONVERTEX, VALVOMATIC, BCS, MANUAL_STITCH, BALING) and ``ProductionPlanStatus`` (DRAFT, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED)
- [ ] **Schema**: Add base models ``ProductionPlan``, ``ProductionPlanLine`` (phase, machineId, operatorId, targetQty, priority, instructions)
- [ ] **Migration**: ``prisma/migrations/*_production_foundation``
- [ ] **API**: Scaffold ``/api/production/plans`` with RBAC ``PRODUCTION`` module + ``requirePermission``
- [ ] **UI**: ``/dashboard/production/page.tsx`` — module landing with empty state + nav to sub-areas
- [ ] **Sidebar**: Confirm Production link resolves (no 404)
- [ ] **Logging**: ``logEvent`` / ``logDiff`` on plan create/update
- [ ] **OpenAPI**: Register production routes in swagger registry
"@

New-ProductionIssue "[P20] Production: Phases and characteristics configuration" @"
# GitHub Task: Production phases and characteristics configuration

**Title**: [P20] Production: Phases and characteristics configuration

**Description**:
Implement PRD §27–28 — configurable production characteristics per phase and shift. Management defines roll types, colours, grades, customer specs, etc. Operators later receive exact requirements from plans. Admin UI in Settings or Data Centre; templates reusable across shift plans.

**PRD refs**: §27 Roll stock characteristics, §28 Production characteristics

**Depends on**: #P19

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``ProductionCharacteristicDefinition`` (phase, key, label, type, options JSON, required, sortOrder)
- [ ] **Schema**: ``ProductionCharacteristicValue`` on plan lines (definitionId + value)
- [ ] **API**: CRUD ``/api/production/characteristics/definitions``
- [ ] **UI**: Data Centre or Settings page — manage characteristic fields per phase (BOBBIN, LOOM, PRINTING, etc.)
- [ ] **UI**: Dynamic form renderer for characteristic values on plan create/edit
- [ ] **Seed**: Default characteristics for LPP roll (colour, width, grade, weight, customer spec) per PRD example
- [ ] **Logging**: Audit all definition changes
"@

New-ProductionIssue "[P21] Production: Shift planning" @"
# GitHub Task: Shift planning

**Title**: [P21] Production: Shift planning

**Description**:
Build PRD §30 shift-wise production planning. Management creates plans with date, shift, phase, machine, operator/team, product, characteristics, target quantity, priority, and instructions. Plans drive what each shift must produce before execution modules record actuals.

**PRD refs**: §30 Shift planning, §62 Ambuja example

**Depends on**: #P19, #P20

**Task Pointers (Checklist)**:
- [ ] **API**: Full CRUD ``/api/production/plans`` — filter by date, shiftId, phase, status
- [ ] **API**: Plan approval workflow (DRAFT → APPROVED) with permission check
- [ ] **UI**: ``/dashboard/production/plans`` — list, create, edit, duplicate plan
- [ ] **UI**: Plan form — shift dropdown (existing Shift master), machine dropdown, operator multi-select, characteristic fields from P20
- [ ] **UI**: Calendar/week view optional — at minimum date filter
- [ ] **Validation**: Cannot approve plan without shift, phase, target qty, and required characteristics
- [ ] **Logging**: Plan create, approve, cancel with full diff
"@

New-ProductionIssue "[P22] Production: Planned vs actual and shift handover" @"
# GitHub Task: Planned vs actual and shift handover

**Title**: [P22] Production: Planned vs actual and shift handover

**Description**:
Implement PRD §29 planned-vs-actual comparison framework and PRD §31 shift handover. Every production run records target, actual, rejected, rework, scrap, achievement %. Outgoing shift logs pending work, WIP, machine status, quality issues for incoming shift.

**PRD refs**: §29 Planned vs actual, §31 Shift handover

**Depends on**: #P21

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``ProductionRun`` (planLineId, startedAt, endedAt, targetQty, actualQty, acceptedQty, rejectedQty, reworkQty, scrapQty, downtimeMinutes)
- [ ] **Schema**: ``ShiftHandover`` (shiftId, date, completedQty, pendingQty, wipNotes, machineStatus, qualityIssues, scrapNotes, remarks, handedOverBy)
- [ ] **API**: ``/api/production/runs``, ``/api/production/handovers``
- [ ] **UI**: Plan detail — planned vs actual summary cards (target, actual, diff, achievement %)
- [ ] **UI**: Shift handover form at end of shift
- [ ] **UI**: Incoming shift view — read previous handover
- [ ] **Logging**: All run completions and handovers audited
"@

New-ProductionIssue "[P23] Production: Dashboard and KPIs" @"
# GitHub Task: Production dashboard and KPIs

**Title**: [P23] Production: Dashboard and KPIs

**Description**:
Production module home per PRD §52 — today's target, actual, achievement, phase-wise and shift-wise production, machine-wise output, delayed plans. Replaces placeholder links on central dashboard where relevant.

**PRD refs**: §52 Production dashboard, §4 Central CRM production summary

**Depends on**: #P21, #P22

**Task Pointers (Checklist)**:
- [ ] **API**: ``GET /api/production/dashboard`` — aggregates for today/current shift
- [ ] **UI**: KPI cards — today's target, actual, achievement %, delayed plans count
- [ ] **UI**: Phase-wise breakdown table/chart
- [ ] **UI**: Shift-wise and machine-wise summary tables
- [ ] **UI**: Quick links to plans, runs, handovers
- [ ] **Central CRM**: Wire ``/dashboard`` production quick-stat to live API (replace fake data)
"@

# ─── Layer 1: Primary manufacturing ──────────────────────────────────────────

New-ProductionIssue "[P24] Production: Bobbin production execution" @"
# GitHub Task: Bobbin production execution

**Title**: [P24] Production: Bobbin production execution

**Description**:
PRD §25 — Bobbin production flow: raw material → bobbin production → QC → bobbin stock. Record shift, machine, operator, input/output, quantity, characteristics, quality, rejection, scrap, target, actual, downtime per plan line.

**PRD refs**: §25 Bobbin production, factory flow §12

**Depends on**: #P22

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``BobbinProductionRun`` extending ProductionRun — rawMaterialItemId, inputQty, outputQty, bobbinCharacteristics JSON
- [ ] **API**: ``/api/production/bobbin/runs`` — create/update/complete run linked to approved plan
- [ ] **UI**: ``/dashboard/production/bobbin`` — operator execution screen
- [ ] **UI**: Select plan line, record input consumption, output bobbins, scrap/rejection
- [ ] **Inventory**: On complete — OUT raw material, IN bobbins (via P36 integration or stub with TODO)
- [ ] **Logging**: Full audit on run start/complete
"@

New-ProductionIssue "[P25] Production: Loom and weaving execution" @"
# GitHub Task: Loom and weaving execution

**Title**: [P25] Production: Loom and weaving execution

**Description**:
PRD §26 — 62 looms, operator assignment (3–4 looms per operator configurable). Track loom assignment, bobbin issue, roll output, characteristics, quality, rejection, scrap, downtime, planned vs actual.

**PRD refs**: §26 Loom/weaving, §46 Workforce (loom operator rules)

**Depends on**: #P24, #P37 (manpower rules — can stub defaults 3–4 looms)

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``LoomProductionRun`` — loomMachineId, operatorId, bobbinIssueQty, rollOutputQty, rollType (PP/LPP), characteristics
- [ ] **Schema**: ``LoomAssignment`` — operatorId, machineIds[] per shift
- [ ] **API**: ``/api/production/loom/runs``, ``/api/production/loom/assignments``
- [ ] **UI**: ``/dashboard/production/loom`` — loom grid/list with status
- [ ] **UI**: Operator view — assigned looms, start/complete run, record roll output
- [ ] **UI**: Bobbin issue from inventory linked to run
- [ ] **Validation**: Warn if operator exceeds configured loom limit
- [ ] **Logging**: Assignment changes and run completions audited
"@

New-ProductionIssue "[P26] Production: Roll stock output tracking" @"
# GitHub Task: Roll stock output tracking

**Title**: [P26] Production: Roll stock output tracking

**Description**:
PRD §27 — PP and LPP roll stock with configurable characteristics (colour, width, grade, weight, customer spec). Track roll identity, length/weight, batch, location, quality status as output from loom/lamination/printing.

**PRD refs**: §27 Roll stock module

**Depends on**: #P25

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``ProductionRoll`` — rollNumber, rollType (PP/LPP), characteristics JSON, length, weight, batchLot, locationId, qualityStatus, sourceRunId
- [ ] **API**: ``/api/production/rolls`` — list, create from run, update status
- [ ] **UI**: ``/dashboard/production/rolls`` — roll catalog with filters by type/characteristics
- [ ] **UI**: Roll detail — traceability back to loom run and plan
- [ ] **Inventory**: Link to inventory items (PP_ROLLS / LPP_ROLLS stock types)
- [ ] **Logging**: Roll creation and status changes audited
"@

# ─── Layer 2: Secondary processing ───────────────────────────────────────────

New-ProductionIssue "[P27] Production: Lamination execution" @"
# GitHub Task: Lamination execution

**Title**: [P27] Production: Lamination execution

**Description**:
PRD §32 — Roll → lamination → laminated roll. Only where required by production plan. Track input roll, PP/LPP, characteristics, materials consumed, machine (ECOTEX), shift, operator, target, actual, output, quality, rejection, scrap.

**PRD refs**: §32 Lamination

**Depends on**: #P26

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``LaminationRun`` — inputRollId, outputRollId, machineId, materialsConsumed JSON
- [ ] **API**: ``/api/production/lamination/runs``
- [ ] **UI**: ``/dashboard/production/lamination`` — select input roll, plan line, record run
- [ ] **UI**: Skip/disable when plan does not require lamination
- [ ] **Inventory**: Consume input roll stock, produce laminated roll
- [ ] **Logging**: Full run audit
"@

New-ProductionIssue "[P28] Production: Printing execution" @"
# GitHub Task: Printing execution

**Title**: [P28] Production: Printing execution

**Description**:
PRD §33 — Pelican 6/8 colour printing. Track input roll, brand/customer, colour, artwork, ink, reducer, external materials, machine, shift, 1 operator + 2 helpers (configurable), target, actual, output, quality, rejection, scrap.

**PRD refs**: §33 Printing, §46 (1 operator + 2 helpers)

**Depends on**: #P26

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``PrintingRun`` — inputRollId, outputRollId, brand, colour, artworkRef, inkMaterials JSON, helperUserIds[]
- [ ] **API**: ``/api/production/printing/runs``
- [ ] **UI**: ``/dashboard/production/printing`` — execution form with helper assignment
- [ ] **UI**: Enforce helper count from config parameter (default 2)
- [ ] **Inventory**: Ink/reducer consumption + printed roll output
- [ ] **Logging**: Run and material consumption audited
"@

New-ProductionIssue "[P29] Production: Cutting execution" @"
# GitHub Task: Cutting execution

**Title**: [P29] Production: Cutting execution

**Description**:
PRD §34 — Printed roll → cutting → cut material. Track input roll, cutting spec, machine (CUTTEX PLUS), shift, operator, target, actual, output, rejection, scrap, quality.

**PRD refs**: §34 Cutting

**Depends on**: #P28

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``CuttingRun`` — inputRollId, cuttingSpec, outputMaterialQty, machineId
- [ ] **API**: ``/api/production/cutting/runs``
- [ ] **UI**: ``/dashboard/production/cutting`` — execution screen
- [ ] **Inventory**: OUT printed roll, IN cut material (CUT_MATERIAL type)
- [ ] **Logging**: Run completion audited
"@

# ─── Layer 3: Finishing routes ───────────────────────────────────────────────

New-ProductionIssue "[P30] Production: Finishing route engine" @"
# GitHub Task: Finishing route engine

**Title**: [P30] Production: Finishing route engine

**Description**:
PRD §35 — Product/plan determines finishing route: Convertex, Valvomatic, BCS, or Manual Stitching. Route selection on plan line drives which execution UI is shown. Prevents wrong route for product type.

**PRD refs**: §35 Finishing routes, §62 Ambuja flow

**Depends on**: #P21

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``FinishingRoute`` enum on ProductionPlanLine (CONVERTEX, VALVOMATIC, BCS, MANUAL_STITCH)
- [ ] **API**: Route validation on plan approve — route required for finishing-phase plans
- [ ] **UI**: Route selector on plan form with description per route
- [ ] **UI**: Production nav shows only relevant finishing sub-module based on active plans
- [ ] **Config**: Default route per product/category in Data Centre (optional)
"@

New-ProductionIssue "[P31] Production: Convertex execution" @"
# GitHub Task: Convertex execution

**Title**: [P31] Production: Convertex execution

**Description**:
PRD §36 — Input → Convertex → finished bags. Full run tracking with characteristics, machine, shift, operator, target, actual, quality, rejection, scrap.

**PRD refs**: §36 Convertex

**Depends on**: #P29, #P30

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``ConvertexRun`` — inputMaterialId, outputBagQty, machineId
- [ ] **API**: ``/api/production/convertex/runs``
- [ ] **UI**: ``/dashboard/production/convertex``
- [ ] **Inventory**: Consume cut material, produce finished bags
- [ ] **Logging**: Run audited
"@

New-ProductionIssue "[P32] Production: Valvomatic execution" @"
# GitHub Task: Valvomatic execution

**Title**: [P32] Production: Valvomatic execution

**Description**:
PRD §37 — Multi-input (roll, yarn, PP/LPP) → Valvomatic → bags. Track complete material usage and output.

**PRD refs**: §37 Valvomatic

**Depends on**: #P30

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``ValvomaticRun`` — inputs JSON (roll/yarn/pp quantities), outputBagQty
- [ ] **API**: ``/api/production/valvomatic/runs``
- [ ] **UI**: ``/dashboard/production/valvomatic`` — multi-input form
- [ ] **Inventory**: Multi-material consumption + bag output
- [ ] **Logging**: Run audited
"@

New-ProductionIssue "[P33] Production: BCS execution" @"
# GitHub Task: BCS execution

**Title**: [P33] Production: BCS execution

**Description**:
PRD §38 — BCS bag-finishing route similar to Valvomatic. Configurable BCS-specific rules. Track inputs, roll, PP/LPP, yarn, characteristics, machine, shift, operator/team, target, actual, quality, rejection, scrap.

**PRD refs**: §38 BCS

**Depends on**: #P30

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``BcsRun`` — mirror Valvomatic pattern with BCS-specific fields
- [ ] **API**: ``/api/production/bcs/runs``
- [ ] **UI**: ``/dashboard/production/bcs``
- [ ] **Config**: BCS rules in ConfigParameter (extensible)
- [ ] **Logging**: Run audited
"@

New-ProductionIssue "[P34] Production: Manual stitching execution" @"
# GitHub Task: Manual stitching execution

**Title**: [P34] Production: Manual stitching execution

**Description**:
PRD §39 — Manual bag production. Track input, product, characteristics, workers, shift, target, actual, accepted, rejected, rework, scrap.

**PRD refs**: §39 Manual stitching

**Depends on**: #P30

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``ManualStitchRun`` — workerIds[], inputMaterialId, outputBagQty
- [ ] **API**: ``/api/production/manual-stitch/runs``
- [ ] **UI**: ``/dashboard/production/manual-stitch`` — worker assignment + output recording
- [ ] **Logging**: Run audited
"@

# ─── Layer 4: Post-production & integration ──────────────────────────────────

New-ProductionIssue "[P35] Production: Baling" @"
# GitHub Task: Baling

**Title**: [P35] Production: Baling

**Description**:
PRD §48 — Bags → bales. Track bags per bale, bale identity, product, characteristics, batch, quantity, date, shift, quality status. Feeds finished goods module (Phase 6).

**PRD refs**: §48 Baling, §47 Finished goods flow

**Depends on**: #P31–#P34 (any finishing route)

**Task Pointers (Checklist)**:
- [ ] **Schema**: ``Bale`` — baleNumber, productId, bagsPerBale, quantity, productionBatch, qualityStatus, shiftId
- [ ] **API**: ``/api/production/baling``
- [ ] **UI**: ``/dashboard/production/baling`` — create bale from approved bags
- [ ] **Inventory**: Transfer finished bags → bales stock type
- [ ] **Logging**: Bale creation audited
"@

New-ProductionIssue "[P36] Production: Inventory integration" @"
# GitHub Task: Production inventory integration

**Title**: [P36] Production: Inventory integration

**Description**:
PRD §50 cross-module — production consumes materials (inventory OUT) and creates output (inventory IN). Every run completion triggers ``InventoryTransaction`` with referenceType PRODUCTION_RUN. Enables traceability from raw material to WIP to finished output.

**PRD refs**: §50 Production → Inventory, §51 Traceability

**Depends on**: #P24 (implement alongside first execution module)

**Task Pointers (Checklist)**:
- [ ] **Lib**: ``resolveProductionInventoryTx(run, type)`` — central helper for IN/OUT
- [ ] **Schema**: ``referenceType`` PRODUCTION_RUN on InventoryTransaction
- [ ] **API**: Hook all run complete endpoints to create transactions atomically in ``\$transaction``
- [ ] **UI**: Show linked inventory movements on run detail
- [ ] **Batch**: Update ``InventoryBatch`` on production output where batchLot applies
- [ ] **Logging**: Correlation ID links production run ↔ inventory tx in audit log
"@

New-ProductionIssue "[P37] Production: Workforce and manpower rules" @"
# GitHub Task: Workforce and manpower rules

**Title**: [P37] Production: Workforce and manpower rules

**Description**:
PRD §46 — Configurable manpower rules: 3–4 looms per operator, 1 operator + 2 helpers per printing machine. Enforced at assignment time with override for supervisors.

**PRD refs**: §46 Workforce management

**Depends on**: #P19

**Task Pointers (Checklist)**:
- [ ] **Config**: ConfigParameter keys ``LOOMS_PER_OPERATOR``, ``PRINTING_HELPERS_PER_OPERATOR``
- [ ] **Lib**: ``validateManpowerAssignment(phase, operatorId, machineIds)``
- [ ] **UI**: Settings or Data Centre — edit manpower rules
- [ ] **UI**: Warning/block on loom and printing assignment when rule exceeded
- [ ] **API**: Return clear error message when validation fails
"@

New-ProductionIssue "[P38] Production: Reports and analytics" @"
# GitHub Task: Production reports and analytics

**Title**: [P38] Production: Reports and analytics

**Description**:
PRD §53 Production reports — daily, shift-wise, phase-wise, machine-wise, product-wise, operator-wise, planned vs actual. Export CSV. Management dashboard answers what was planned vs produced.

**PRD refs**: §53 Production reports, §65 Key management questions

**Depends on**: #P22, #P23

**Task Pointers (Checklist)**:
- [ ] **API**: ``GET /api/production/reports`` — query params: dateRange, shift, phase, machine, operator
- [ ] **UI**: ``/dashboard/production/reports`` — filters + data table
- [ ] **UI**: Planned vs actual report with achievement %
- [ ] **UI**: Phase-wise and operator-wise breakdown
- [ ] **Export**: CSV download using existing logs export pattern
- [ ] **RBAC**: Reports require PRODUCTION canRead; export may need separate permission later
"@

Write-Output "Created P19-P38 production issues"
