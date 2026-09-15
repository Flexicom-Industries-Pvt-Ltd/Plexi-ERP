$repo = "Flexicom-Industries-Pvt-Ltd/Plexi-ERP"
$dir = Join-Path $PSScriptRoot "issue-bodies"

$bodies = @{
  211 = @"
# GitHub Task: Production phases and characteristics configuration

**Title**: [P20] Production: Phases and characteristics configuration

**Description**:
Implement PRD Sections 27-28 - configurable production characteristics per phase and shift. Management defines roll types, colours, grades, customer specs, etc. Operators later receive exact requirements from plans.

**PRD references**: Section 27 Roll stock characteristics, Section 28 Production characteristics

**Depends on**: P19 (#210)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `ProductionCharacteristicDefinition` (phase, key, label, type, options JSON, required, sortOrder)
- [ ] **Schema**: `ProductionCharacteristicValue` on plan lines (definitionId + value)
- [ ] **API**: CRUD `/api/production/characteristics/definitions`
- [ ] **UI**: Data Centre or Settings page - manage characteristic fields per phase
- [ ] **UI**: Dynamic form renderer for characteristic values on plan create/edit
- [ ] **Seed**: Default characteristics for LPP roll (colour, width, grade, weight, customer spec)
- [ ] **Logging**: Audit all definition changes
"@
  212 = @"
# GitHub Task: Shift planning

**Title**: [P21] Production: Shift planning

**Description**:
Build PRD Section 30 shift-wise production planning. Management creates plans with date, shift, phase, machine, operator/team, product, characteristics, target quantity, priority, and instructions.

**PRD references**: Section 30 Shift planning, Section 62 Ambuja example

**Depends on**: P19 (#210), P20 (#211)

**Task Pointers (Checklist)**:
- [ ] **API**: Full CRUD `/api/production/plans` - filter by date, shiftId, phase, status
- [ ] **API**: Plan approval workflow (DRAFT to APPROVED) with permission check
- [ ] **UI**: `/dashboard/production/plans` - list, create, edit, duplicate plan
- [ ] **UI**: Plan form with shift, machine, operator, and characteristic fields
- [ ] **UI**: Date filter (calendar/week view optional)
- [ ] **Validation**: Cannot approve plan without shift, phase, target qty, and required characteristics
- [ ] **Logging**: Plan create, approve, cancel with full diff
"@
  213 = @"
# GitHub Task: Planned vs actual and shift handover

**Title**: [P22] Production: Planned vs actual and shift handover

**Description**:
Implement PRD Section 29 planned-vs-actual comparison and PRD Section 31 shift handover. Record target, actual, rejected, rework, scrap, achievement percent. Outgoing shift logs pending work for incoming shift.

**PRD references**: Section 29 Planned vs actual, Section 31 Shift handover

**Depends on**: P21 (#212)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `ProductionRun` (planLineId, startedAt, endedAt, targetQty, actualQty, acceptedQty, rejectedQty, reworkQty, scrapQty, downtimeMinutes)
- [ ] **Schema**: `ShiftHandover` (shiftId, date, completedQty, pendingQty, wipNotes, machineStatus, qualityIssues, scrapNotes, remarks)
- [ ] **API**: `/api/production/runs`, `/api/production/handovers`
- [ ] **UI**: Plan detail - planned vs actual summary (target, actual, diff, achievement %)
- [ ] **UI**: Shift handover form at end of shift
- [ ] **UI**: Incoming shift view - read previous handover
- [ ] **Logging**: All run completions and handovers audited
"@
  214 = @"
# GitHub Task: Production dashboard and KPIs

**Title**: [P23] Production: Dashboard and KPIs

**Description**:
Production module home per PRD Section 52 - today's target, actual, achievement, phase-wise and shift-wise production, machine-wise output, delayed plans.

**PRD references**: Section 52 Production dashboard, Section 4 Central CRM production summary

**Depends on**: P21 (#212), P22 (#213)

**Task Pointers (Checklist)**:
- [ ] **API**: `GET /api/production/dashboard` - aggregates for today/current shift
- [ ] **UI**: KPI cards - target, actual, achievement %, delayed plans
- [ ] **UI**: Phase-wise, shift-wise, and machine-wise summary tables
- [ ] **UI**: Quick links to plans, runs, handovers
- [ ] **Central CRM**: Wire `/dashboard` production stat to live API (replace fake data)
"@
  215 = @"
# GitHub Task: Bobbin production execution

**Title**: [P24] Production: Bobbin production execution

**Description**:
PRD Section 25 - Bobbin production: raw material to bobbin production to QC to bobbin stock. Record shift, machine, operator, input/output, scrap, target, actual, downtime.

**PRD references**: Section 25 Bobbin production

**Depends on**: P22 (#213)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `BobbinProductionRun` linked to ProductionRun
- [ ] **API**: `/api/production/bobbin/runs`
- [ ] **UI**: `/dashboard/production/bobbin` - operator execution screen
- [ ] **UI**: Record input consumption, output bobbins, scrap/rejection
- [ ] **Inventory**: On complete - OUT raw material, IN bobbins (via P36)
- [ ] **Logging**: Full audit on run start/complete
"@
  216 = @"
# GitHub Task: Loom and weaving execution

**Title**: [P25] Production: Loom and weaving execution

**Description**:
PRD Section 26 - 62 looms, operator assignment (3-4 looms per operator). Track loom assignment, bobbin issue, roll output, characteristics, quality, scrap, downtime.

**PRD references**: Section 26 Loom/weaving, Section 46 Workforce rules

**Depends on**: P24 (#215), P37 (#228) for manpower rules

**Task Pointers (Checklist)**:
- [ ] **Schema**: `LoomProductionRun`, `LoomAssignment`
- [ ] **API**: `/api/production/loom/runs`, `/api/production/loom/assignments`
- [ ] **UI**: `/dashboard/production/loom` - loom grid with status
- [ ] **UI**: Operator view - assigned looms, start/complete run
- [ ] **Validation**: Warn if operator exceeds configured loom limit
- [ ] **Logging**: Assignment and run completions audited
"@
  217 = @"
# GitHub Task: Roll stock output tracking

**Title**: [P26] Production: Roll stock output tracking

**Description**:
PRD Section 27 - PP and LPP roll stock with configurable characteristics. Track roll identity, weight, batch, location, quality status.

**PRD references**: Section 27 Roll stock module

**Depends on**: P25 (#216)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `ProductionRoll` (rollNumber, rollType, characteristics JSON, batchLot, locationId)
- [ ] **API**: `/api/production/rolls`
- [ ] **UI**: `/dashboard/production/rolls` - roll catalog with filters
- [ ] **UI**: Roll detail with traceability to loom run and plan
- [ ] **Inventory**: Link to PP_ROLLS / LPP_ROLLS inventory items
- [ ] **Logging**: Roll creation and status changes audited
"@
  218 = @"
# GitHub Task: Lamination execution

**Title**: [P27] Production: Lamination execution

**Description**:
PRD Section 32 - Roll to lamination to laminated roll. Only where required by plan. Track input roll, machine (ECOTEX), operator, target, actual, scrap.

**PRD references**: Section 32 Lamination

**Depends on**: P26 (#217)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `LaminationRun` (inputRollId, outputRollId, machineId)
- [ ] **API**: `/api/production/lamination/runs`
- [ ] **UI**: `/dashboard/production/lamination`
- [ ] **Inventory**: Consume input roll, produce laminated roll
- [ ] **Logging**: Full run audit
"@
  219 = @"
# GitHub Task: Printing execution

**Title**: [P28] Production: Printing execution

**Description**:
PRD Section 33 - Pelican 6/8 colour printing. Track input roll, brand, colour, ink, helpers (1 operator + 2 helpers), target, actual, scrap.

**PRD references**: Section 33 Printing, Section 46 Workforce

**Depends on**: P26 (#217)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `PrintingRun` with helperUserIds array
- [ ] **API**: `/api/production/printing/runs`
- [ ] **UI**: `/dashboard/production/printing`
- [ ] **UI**: Enforce helper count from config (default 2)
- [ ] **Inventory**: Ink consumption and printed roll output
- [ ] **Logging**: Run audited
"@
  220 = @"
# GitHub Task: Cutting execution

**Title**: [P29] Production: Cutting execution

**Description**:
PRD Section 34 - Printed roll to cutting to cut material. Machine CUTTEX PLUS. Track input, spec, target, actual, scrap.

**PRD references**: Section 34 Cutting

**Depends on**: P28 (#219)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `CuttingRun`
- [ ] **API**: `/api/production/cutting/runs`
- [ ] **UI**: `/dashboard/production/cutting`
- [ ] **Inventory**: OUT printed roll, IN cut material
- [ ] **Logging**: Run audited
"@
  221 = @"
# GitHub Task: Finishing route engine

**Title**: [P30] Production: Finishing route engine

**Description**:
PRD Section 35 - Plan determines finishing route: Convertex, Valvomatic, BCS, or Manual Stitching.

**PRD references**: Section 35 Finishing routes

**Depends on**: P21 (#212)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `FinishingRoute` enum on ProductionPlanLine
- [ ] **API**: Route validation on plan approve
- [ ] **UI**: Route selector on plan form
- [ ] **UI**: Production nav shows relevant finishing sub-module
"@
  222 = @"
# GitHub Task: Convertex execution

**Title**: [P31] Production: Convertex execution

**Description**:
PRD Section 36 - Input to Convertex to finished bags.

**PRD references**: Section 36 Convertex

**Depends on**: P29 (#220), P30 (#221)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `ConvertexRun`
- [ ] **API**: `/api/production/convertex/runs`
- [ ] **UI**: `/dashboard/production/convertex`
- [ ] **Inventory**: Consume cut material, produce finished bags
- [ ] **Logging**: Run audited
"@
  223 = @"
# GitHub Task: Valvomatic execution

**Title**: [P32] Production: Valvomatic execution

**Description**:
PRD Section 37 - Multi-input (roll, yarn, PP/LPP) to Valvomatic to bags.

**PRD references**: Section 37 Valvomatic

**Depends on**: P30 (#221)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `ValvomaticRun` with inputs JSON
- [ ] **API**: `/api/production/valvomatic/runs`
- [ ] **UI**: `/dashboard/production/valvomatic`
- [ ] **Inventory**: Multi-material consumption and bag output
- [ ] **Logging**: Run audited
"@
  224 = @"
# GitHub Task: BCS execution

**Title**: [P33] Production: BCS execution

**Description**:
PRD Section 38 - BCS bag-finishing route similar to Valvomatic. Configurable rules.

**PRD references**: Section 38 BCS

**Depends on**: P30 (#221)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `BcsRun`
- [ ] **API**: `/api/production/bcs/runs`
- [ ] **UI**: `/dashboard/production/bcs`
- [ ] **Config**: BCS rules in ConfigParameter
- [ ] **Logging**: Run audited
"@
  225 = @"
# GitHub Task: Manual stitching execution

**Title**: [P34] Production: Manual stitching execution

**Description**:
PRD Section 39 - Manual bag production with workers, shift, target, actual, rejected, rework, scrap.

**PRD references**: Section 39 Manual stitching

**Depends on**: P30 (#221)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `ManualStitchRun` with workerIds
- [ ] **API**: `/api/production/manual-stitch/runs`
- [ ] **UI**: `/dashboard/production/manual-stitch`
- [ ] **Logging**: Run audited
"@
  226 = @"
# GitHub Task: Baling

**Title**: [P35] Production: Baling

**Description**:
PRD Section 48 - Bags to bales. Track bale identity, bags per bale, batch, quality status. Feeds finished goods (Phase 6).

**PRD references**: Section 48 Baling, Section 47 Finished goods

**Depends on**: P31-P34 (any finishing route)

**Task Pointers (Checklist)**:
- [ ] **Schema**: `Bale` model
- [ ] **API**: `/api/production/baling`
- [ ] **UI**: `/dashboard/production/baling`
- [ ] **Inventory**: Transfer finished bags to bales stock
- [ ] **Logging**: Bale creation audited
"@
  227 = @"
# GitHub Task: Production inventory integration

**Title**: [P36] Production: Inventory integration

**Description**:
PRD Section 50 - Production consumes materials (OUT) and creates output (IN). Every run creates InventoryTransaction with referenceType PRODUCTION_RUN.

**PRD references**: Section 50 Production to Inventory, Section 51 Traceability

**Depends on**: P24 (#215) - wire into each execution module

**Task Pointers (Checklist)**:
- [ ] **Lib**: Central helper for production inventory IN/OUT transactions
- [ ] **Schema**: referenceType PRODUCTION_RUN on InventoryTransaction
- [ ] **API**: Atomic transaction on all run complete endpoints
- [ ] **UI**: Show linked inventory movements on run detail
- [ ] **Logging**: Correlation ID links run to inventory tx
"@
  228 = @"
# GitHub Task: Workforce and manpower rules

**Title**: [P37] Production: Workforce and manpower rules

**Description**:
PRD Section 46 - Configurable rules: 3-4 looms per operator, 1 operator + 2 helpers per printing machine.

**PRD references**: Section 46 Workforce management

**Depends on**: P19 (#210)

**Task Pointers (Checklist)**:
- [ ] **Config**: LOOMS_PER_OPERATOR, PRINTING_HELPERS_PER_OPERATOR in ConfigParameter
- [ ] **Lib**: validateManpowerAssignment helper
- [ ] **UI**: Settings page to edit manpower rules
- [ ] **UI**: Warning on loom/printing assignment when rule exceeded
- [ ] **API**: Clear error when validation fails
"@
  229 = @"
# GitHub Task: Production reports and analytics

**Title**: [P38] Production: Reports and analytics

**Description**:
PRD Section 53 - Daily, shift-wise, phase-wise, machine-wise, operator-wise, planned vs actual reports. CSV export.

**PRD references**: Section 53 Production reports

**Depends on**: P22 (#213), P23 (#214)

**Task Pointers (Checklist)**:
- [ ] **API**: `GET /api/production/reports` with filters
- [ ] **UI**: `/dashboard/production/reports`
- [ ] **UI**: Planned vs actual report with achievement %
- [ ] **Export**: CSV download
- [ ] **RBAC**: PRODUCTION canRead required
"@
}

# Issue 210 from file
gh issue edit 210 --repo $repo --body-file (Join-Path $dir "210.md")

foreach ($num in $bodies.Keys) {
  $path = Join-Path $dir "$num.md"
  Set-Content -Path $path -Value $bodies[$num] -Encoding utf8NoBOM
  gh issue edit $num --repo $repo --body-file $path
  Write-Output "Updated #$num"
}

Write-Output "Done"
