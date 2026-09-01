$repo = "Flexicom-Industries-Pvt-Ltd/Plexi-ERP"
$assignee = "Debsmit16"
$project = 4
$owner = "Flexicom-Industries-Pvt-Ltd"
$statusField = "PVTSSF_lADOEvYx6M4Bgs4szhfrbrI"
$todoOption = "f75ad846"

function New-Issue($title, $body) {
  $url = gh issue create --repo $repo --assignee $assignee --title $title --body $body
  gh project item-add $project --owner $owner --url $url | Out-Null
  Write-Output $url
}

# P2 gaps (implement now)
New-Issue "[P10] Gate: Document verify/reject UI" @"
# GitHub Task: Gate document verify/reject UI

**Description**:
Add verify/reject actions on gate entry documents. Keep placeholder fileUrl until AWS S3 is configured.

**Task Pointers (Checklist)**:
- [ ] Verify/reject buttons on gate detail documents tab
- [ ] Wire to PATCH /api/gate/[id]/documents/[docId]
- [ ] Show verifier name and timestamp
"@

New-Issue "[P11] Gate: Parking and waiting fields" @"
# GitHub Task: Parking and waiting fields

**Description**:
Expose parkingLocation and waitingReason on gate entry detail for trucks in parking/waiting states.

**Task Pointers (Checklist)**:
- [ ] Parking/waiting form on gate detail overview
- [ ] PATCH API accepts parkingLocation and waitingReason
"@

New-Issue "[P12] Gate: Gate-out validation rules" @"
# GitHub Task: Gate-out validation rules

**Description**:
Enforce PRD gate-out rules: completed workflow, verified documents, inventory committed for unloading.

**Task Pointers (Checklist)**:
- [ ] validateGateOut helper
- [ ] Block GATE_OUT in PATCH when rules fail
- [ ] Surface validation errors in UI
"@

New-Issue "[P13] Gate: Security dashboard KPIs" @"
# GitHub Task: Security dashboard KPIs

**Description**:
Live KPI cards on gate module: trucks inside, waiting, loading, unloading, verification pending.

**Task Pointers (Checklist)**:
- [ ] GET /api/gate/stats
- [ ] KPI cards on gate list page
"@

# P3 gaps (implement now)
New-Issue "[P14] Data Centre: SubCategory admin" @"
# GitHub Task: SubCategory admin

**Description**:
Add SubCategory master data config and Data Centre page. Fix inventory items subcategory fetch.

**Task Pointers (Checklist)**:
- [ ] subCategory in masterDataConfig
- [ ] Data Centre page and sidebar link
- [ ] Fix items client API path
"@

New-Issue "[P15] Inventory: Batch/lot tracking" @"
# GitHub Task: Batch/lot tracking

**Description**:
Track inventory by batch/lot from gate receipts through InventoryBatch model.

**Task Pointers (Checklist)**:
- [ ] InventoryBatch schema + migration
- [ ] batchLot on InventoryTransaction
- [ ] Gate receipt commit upserts batches
- [ ] Batches API and UI
"@

New-Issue "[P16] Inventory: Stock visibility metrics" @"
# GitHub Task: Stock visibility metrics

**Description**:
Show available, reserved, consumed, and received quantities per inventory item.

**Task Pointers (Checklist)**:
- [ ] reservedStock on InventoryItem
- [ ] Movement summary on items API
- [ ] Columns on items list
"@

New-Issue "[P17] Inventory: Location-wise stock view" @"
# GitHub Task: Location-wise stock view

**Description**:
Group inventory by storage location on dashboard.

**Task Pointers (Checklist)**:
- [ ] GET /api/inventory/by-location
- [ ] Location stock section on inventory dashboard
"@

New-Issue "[P18] Inventory: Bobbin and roll stock views" @"
# GitHub Task: Bobbin and roll stock views

**Description**:
Filtered inventory views for bobbins and roll stock (PP/LPP/laminated/printed).

**Task Pointers (Checklist)**:
- [ ] materialType filter on items API
- [ ] /dashboard/inventory/bobbins page
- [ ] /dashboard/inventory/rolls page
- [ ] Sidebar links under Inventory
"@

# Future phases (plan only)
New-Issue "[P20] Epic: Phase 4 Production module" @"
# Epic: Phase 4 — Production (PRD §66)

**Description**: Planning epic. Not in current sprint.

**Scope**: Shift planning, production characteristics, bobbin/loom/lamination/printing/cutting/finishing/baling modules, planned vs actual.

**Dependencies**: Phase 3 complete.
"@

New-Issue "[P21] Epic: Phase 5 Control module" @"
# Epic: Phase 5 — Control (PRD §66)

**Description**: Planning epic. QC, rework, scrap, RP/recycling, maintenance.

**Dependencies**: Phase 4.
"@

New-Issue "[P22] Epic: Phase 6 Commercial operations" @"
# Epic: Phase 6 — Commercial (PRD §66)

**Description**: Planning epic. Finished goods, dispatch, loading, reports, management dashboards.

**Dependencies**: Phase 5.
"@

New-Issue "[P23] Epic: Cross-cutting platform" @"
# Epic: Cross-cutting (PRD §54–59)

**Description**: Notifications, approvals, traceability, offline/PWA/Electron, central search, S3 document upload (deferred).

**Note**: S3 upload blocked until AWS setup.
"@

Write-Output "Done creating issues"
