
# PLASCOM CENTRAL CRM & MANUFACTURING ERP

## Complete Product Requirements Document — Functional Specification

---

# 1. Product Overview

The Plascom ERP is a **centralized manufacturing CRM/ERP platform** designed to manage the complete operational lifecycle of the factory.

The system will consist of:

* One **Central CRM**
* Multiple independent business modules/apps
* Centralized users and role-based access control
* Centralized settings and configuration
* Centralized activity/audit logs
* Manufacturing and production management
* Inventory management
* Quality management
* Machine and maintenance management
* Recycling Plant management
* Finished goods and dispatch management

Each business module should function as an **independent application from the user's perspective**, while all modules remain connected through the central business system.

---

# 2. Core Product Principle

The system follows:

> **One Central CRM + Multiple Independent Business Apps + One Central Business Record**

Example:

```text
                    CENTRAL CRM
                        │
                Users / Roles / RBAC
                        │
        ┌───────────────┼────────────────┐
        │               │                │
     Security       Production       Inventory
        │               │                │
      Quality       Maintenance          RP
        │               │                │
     Dispatch          HR             Reports
        └───────────────┼────────────────┘
                        │
                 Central Business Data
```

A user should only see the modules and functions assigned to them.

---

# 3. Main Applications

The system will contain the following major applications:

1. **Central CRM / Dashboard**
2. **Settings & Administration**
3. **Users & RBAC**
4. **Logs & Audit**
5. **Security & Gate Management**
6. **Production Management**
7. **Inventory & Stores**
8. **Quality Management**
9. **Machine Management**
10. **Maintenance**
11. **Recycling Plant (RP)**
12. **Finished Goods**
13. **Dispatch & Loading**
14. **Employee / Workforce Management**
15. **Reports & Analytics**

Additional modules can be introduced later without changing the core concept.

---

# 4. CENTRAL CRM

The Central CRM is the main entry point.

## Features

* Dashboard
* User profile
* Assigned applications
* Notifications
* Pending approvals
* Recent activities
* Factory status
* Production summary
* Inventory summary
* Truck status
* Quality summary
* Machine status
* Dispatch status
* Central search

The dashboard shown to each user must depend on their permissions.

---

# 5. SETTINGS & ADMINISTRATION MODULE

This is the first foundational module.

The Settings module controls the entire system.

## 5.1 Organization Settings

Management can configure:

* Company
* Factory/plant
* Departments
* Sections
* Production phases
* Locations
* Storage locations
* Machines
* Shifts
* Units of measurement
* Material categories
* Product categories
* Statuses
* Configurable business parameters

---

# 6. USER MANAGEMENT

Authorized administrators can create and manage users.

## User creation

Capture:

* Name
* Employee ID
* Contact details
* Department
* Designation
* Role
* Assigned modules
* Status
* Profile information

## User statuses

* Active
* Inactive
* Suspended

## User management

Administrators can:

* Create user
* Edit user
* Activate/deactivate user
* Assign role
* Remove role
* Reset access
* View user activity

---

# 7. ROLE MANAGEMENT

Management can create custom roles.

Examples:

* Super Admin
* Plant Manager
* Production Manager
* Production Supervisor
* Security Officer
* Store Manager
* QC Manager
* Maintenance Manager
* Dispatch Manager
* Operator
* Viewer

Roles must be configurable rather than permanently hard-coded.

---

# 8. MODULE ACCESS CONTROL

Management can decide which applications each role can access.

Example:

```text
Production Manager

Production       ✓
Inventory        ✓
Quality          ✓
Maintenance      View
Security         View
Finance          ✗
Settings         ✗
```

---

# 9. FEATURE-LEVEL PERMISSIONS

Module access alone is insufficient.

Each module should support permissions such as:

* View
* Create
* Edit
* Delete
* Approve
* Reject
* Export
* Print
* Reports
* Administration

Example:

```text
Production
├── View
├── Create Production Plan
├── Edit Production Plan
├── Approve
├── Execute Production
└── Reports
```

---

# 10. PERSON-SPECIFIC ACCESS

Management should be able to assign access to:

* Roles
* Individual users

A specific authorized user may receive additional access without changing the permissions of everyone sharing their role.

---

# 11. LOGS & AUDIT MODULE

The system must maintain a complete activity history.

Record important actions such as:

* Login
* Logout
* User creation
* Role changes
* Permission changes
* Production plan creation
* Production changes
* Inventory transactions
* QC decisions
* Truck entries
* Document verification
* Stock receipts
* Dispatch
* Approvals
* Rejections
* Configuration changes

Each activity should identify:

* User
* Action
* Record affected
* Date/time
* Previous value where applicable
* New value where applicable
* Reason where required

Management should be able to search and filter logs.

---

# 12. FACTORY MANUFACTURING MODEL

The current understanding of the manufacturing flow is:

```text
RAW MATERIAL
      ↓
BOBBIN
      ↓
LOOM / WEAVING
      ↓
ROLL STOCK
   PP / LPP
      ↓
LAMINATION
      ↓
PRINTING
      ↓
CUTTING
      ↓
FINISHING
 ┌────┼────────┬────────────┐
 ↓    ↓        ↓            ↓
CONV. VALVOMATIC BCS   MANUAL STITCH
 └────┴────────┴────────────┘
             ↓
        FINISHED BAGS
             ↓
        SEGREGATION
             ↓
           BALING
             ↓
       FINISHED GOODS
             ↓
          LOADING
             ↓
          DISPATCH
```

There is also a recycling loop:

```text
SCRAP FROM PRODUCTION
          ↓
         RP
  RECYCLING PLANT
          ↓
      RP GRANULES
          ↓
      PRODUCTION
```

The factory layout confirms major areas/equipment including bobbin storage, the loom section, Pelican printing machines, ECOTEX, CUTTEX PLUS and CONVERTEX.

---

# 13. MODULE 1 — SECURITY & GATE MANAGEMENT

This is the first operational module.

## Objective

Manage every truck from arrival at the factory gate until gate-out.

---

## 13.1 Truck Entry

Create a unique **Gate Entry ID**.

Capture:

* Truck number
* Driver name
* Driver contact
* Transporter
* Supplier/customer
* Arrival date
* Arrival time
* Purpose

  * Loading
  * Unloading
* Expected material
* Expected quantity
* Relevant stock details

A truck may carry multiple stock/material items.

---

# 14. TRUCK STOCK DETAILS

For every truck, capture:

* Material/stock name
* Material type
* Quantity
* Unit
* Batch/lot
* Supplier/customer
* Expected quantity
* Actual quantity

Example:

```text
Truck: WBXX1234

Purpose: Unloading

Material: PP Granules
Expected: 25,000 kg
Batch: PP-001
Supplier: ABC
```

---

# 15. DOCUMENT MANAGEMENT

Required truck/material documents can be entered or uploaded.

Each document has a status:

```text
Pending
   ↓
Under Verification
   ↓
Verified
```

or:

```text
Rejected
```

Authorized users can verify documents.

---

# 16. TRUCK STATUS

The complete truck lifecycle:

```text
ARRIVED
   ↓
DOCUMENT VERIFICATION
   ↓
VERIFIED
   ↓
PARKING / WAITING
   ↓
READY
   ↓
LOADING / UNLOADING
   ↓
COMPLETED
   ↓
GATE OUT
```

Additional statuses:

* On Hold
* Rejected
* Cancelled

---

# 17. PARKING & WAITING

Features:

* Parking assignment
* Waiting area
* Queue position
* Waiting time
* Current waiting trucks
* Reason for waiting

Management should see all trucks currently inside the factory.

---

# 18. UNLOADING

When unloading is selected:

```text
Truck
 ↓
Unloading
 ↓
Material Received
 ↓
Quantity Confirmed
 ↓
Inventory Updated
```

Capture:

* Material
* Expected quantity
* Actual quantity
* Difference
* Batch/lot
* Unloading completion
* Relevant remarks

The confirmed received quantity creates the corresponding Inventory transaction.

---

# 19. LOADING

When loading is selected:

```text
Finished Goods
 ↓
Truck
 ↓
Loading
 ↓
Quantity Confirmed
 ↓
Dispatch
```

Capture:

* Product
* Characteristics
* Quantity
* Bale count
* Customer/order
* Truck
* Driver
* Loading completion

---

# 20. GATE OUT

Before gate-out:

* Loading/unloading must be completed.
* Required verification must be complete.
* Relevant transaction must be closed.

Record:

* Exit time
* Final quantity
* Final status
* Gate-out confirmation

Then close the Gate Entry.

---

# 21. SECURITY DASHBOARD

Display:

* Trucks inside factory
* Arrived trucks
* Verification pending
* Waiting trucks
* Loading trucks
* Unloading trucks
* Trucks on hold
* Completed trucks
* Gate-out history

Filters:

* Date
* Truck
* Supplier/customer
* Material
* Status
* Loading/unloading

---

# 22. INVENTORY & STORES MODULE

The Inventory module manages material throughout its lifecycle.

## Inventory categories

* Raw materials
* Bobbins
* PP rolls
* LPP rolls
* Laminated rolls
* Printed rolls
* Cut material
* Work-in-progress
* Finished bags
* Bales
* Scrap
* RP granules
* External materials

---

# 23. INVENTORY FLOW

```text
Receiving
 ↓
Raw Material Stock
 ↓
Production Consumption
 ↓
WIP
 ↓
Next Phase
 ↓
Finished Goods
 ↓
Dispatch
```

Every material movement must be recorded.

---

# 24. STOCK VISIBILITY

Management should see:

* Available quantity
* Reserved quantity
* Consumed quantity
* Pending quantity
* Batch/lot
* Location
* Quality status

---

# 25. BOBBIN PRODUCTION MODULE

Flow:

```text
Raw Material
 ↓
Bobbin Production
 ↓
QC
 ↓
Bobbin Stock
```

Record:

* Shift
* Machine
* Operator
* Input
* Output
* Quantity
* Bobbin characteristics
* Quality
* Rejection
* Scrap
* Target
* Actual
* Downtime

---

# 26. LOOM / WEAVING MODULE

The plant layout indicates:

**62 looms — 31 new + 31 existing.**

Operationally, the current factory understanding is that approximately **3–4 looms may be operated by one operator**.

The module should support:

* Loom assignment
* Operator assignment
* Shift assignment
* Bobbin issue
* Production target
* Production characteristics
* Roll output
* Quality
* Rejection
* Scrap
* Downtime
* Planned vs actual

---

# 27. ROLL STOCK MODULE

Two major roll-stock categories:

* PP
* LPP

Each can contain multiple characteristics.

The characteristics must be configurable.

Example:

```text
Roll Type: LPP

Characteristics:
Colour
Width
Grade
Weight
Customer specification
Other configured properties
```

---

# 28. PRODUCTION CHARACTERISTICS

This is a core system feature.

Management can define characteristics for **every production phase and shift**.

Example:

```text
Phase: Printing
Shift: A

Roll Type: LPP
Colour: Yellow
Printing: Ambuja
Target: 500
```

The operator receives the exact requirement.

The same mechanism must work for:

* Bobbin
* Loom
* Lamination
* Printing
* Cutting
* Finishing
* Other configurable phases

---

# 29. PLANNED VS ACTUAL

Every production phase must compare:

**Planned**

vs

**Actual**

Example:

```text
Planned:
LPP / Yellow / Ambuja
500

Actual:
470

Rejected:
12

Scrap:
8
```

Show:

* Target
* Actual
* Difference
* Achievement %
* Accepted
* Rejected
* Rework
* Scrap

---

# 30. SHIFT PLANNING

Management creates shift-wise plans.

Each plan may contain:

* Date
* Shift
* Phase
* Machine
* Operator/team
* Product
* Characteristics
* Target quantity
* Priority
* Instructions

---

# 31. SHIFT HANDOVER

Outgoing shift records:

* Production completed
* Pending target
* Material remaining
* WIP
* Machine status
* Breakdown
* Quality issues
* Scrap
* Important remarks

Incoming shift receives this information.

---

# 32. LAMINATION MODULE

Flow:

```text
Roll Stock
 ↓
Lamination
 ↓
Laminated Roll
```

Track:

* Input roll
* PP/LPP
* Characteristics
* Lamination requirements
* Materials consumed
* Machine
* Shift
* Operator
* Target
* Actual
* Output
* Quality
* Rejection
* Scrap

Lamination should be applied only where required by the product/production plan.

The layout identifies ECOTEX 1600L in the production area.

---

# 33. PRINTING MODULE

The layout identifies:

* Pelican 6 Colour
* Pelican 8 Colour

Track:

* Input roll
* Roll characteristics
* Brand/customer
* Printing requirement
* Colour
* Artwork/design
* Ink
* Reducer
* External materials
* Machine
* Shift
* Operator
* Helpers
* Target
* Actual
* Output
* Quality
* Rejection
* Scrap

Current manpower understanding:

**1 operator + 2 helpers per printing machine**, configurable by management.

---

# 34. CUTTING MODULE

Flow:

```text
Printed Roll
 ↓
Cutting
 ↓
Cut Material
```

Track:

* Input roll
* Cutting specification
* Machine
* Shift
* Operator
* Target
* Actual
* Output
* Rejection
* Scrap
* Quality

The layout identifies CUTTEX PLUS.

---

# 35. FINISHING / BAG MANUFACTURING

The finishing route depends on the product.

Supported routes:

* Convertex
* Valvomatic
* BCS
* Manual Stitching

The system must allow the production plan/product specification to determine the appropriate route.

---

# 36. CONVERTEX

```text
Required Input
 ↓
Convertex
 ↓
Finished Bags
```

Track:

* Input
* Characteristics
* Machine
* Shift
* Operator
* Target
* Actual
* Output
* Quality
* Rejection
* Scrap

The layout identifies CONVERTEX.

---

# 37. VALVOMATIC

Potential inputs:

* Roll
* Yarn
* PP/LPP
* Other required material

Flow:

```text
Inputs
 ↓
Valvomatic
 ↓
Bags
```

Track complete production and material usage.

---

# 38. BCS

BCS is treated as a similar bag-finishing route to Valvomatic.

Support:

* Inputs
* Roll
* PP/LPP
* Yarn where required
* Characteristics
* Machine
* Shift
* Operator/team
* Target
* Actual
* Quality
* Rejection
* Scrap

Exact BCS-specific rules remain configurable/to be confirmed.

---

# 39. MANUAL STITCHING

Support manual bag production where applicable.

Track:

* Input
* Product
* Characteristics
* Workers
* Shift
* Target
* Actual
* Accepted
* Rejected
* Rework
* Scrap

---

# 40. QUALITY MANAGEMENT MODULE

Quality operates across the entire production lifecycle.

Quality checkpoints include:

* Incoming material
* Bobbin
* Roll
* Lamination
* Printing
* Cutting
* Finishing
* Final bags
* Finished bales where applicable

Results:

* Pass
* Fail
* Hold
* Rework

Quality characteristics must be configurable.

---

# 41. REWORK

```text
QC Failure
 ↓
Decision
 ├── Rework
 │     ↓
 │   Production
 │     ↓
 │    QC
 │
 └── Scrap
       ↓
      RP
```

Every rework action must retain its history.

---

# 42. SCRAP MANAGEMENT

Scrap can be generated at multiple stages.

Record:

* Source phase
* Machine
* Shift
* Material/product
* Quantity
* Reason
* Status
* RP transfer

Scrap must not simply disappear from inventory.

---

# 43. RP — RECYCLING PLANT MODULE

RP means **Recycling Plant**.

Flow:

```text
Production Scrap
      ↓
RP Plant
      ↓
RP Granules
      ↓
Inventory
      ↓
Production
```

Track:

* Scrap source
* Scrap type
* Quantity
* Phase
* Machine
* Shift
* Recycling quantity
* RP granules produced
* Recovery/loss
* RP granule stock

---

# 44. MACHINE MANAGEMENT MODULE

Maintain machines including:

* Looms
* Printing machines
* Lamination equipment
* Cutting machines
* Convertex
* Valvomatic
* BCS
* Other factory equipment

The layout identifies the major production machinery and electrical infrastructure.

Machine statuses:

* Running
* Idle
* Breakdown
* Maintenance
* Stopped

---

# 45. MAINTENANCE MODULE

Flow:

```text
Machine Breakdown
 ↓
Report
 ↓
Maintenance
 ↓
Repair
 ↓
Testing
 ↓
Available
 ↓
Production Resumes
```

Track:

* Machine
* Issue
* Reporter
* Date/time
* Shift
* Downtime
* Maintenance action
* Resolution
* Status
* History

---

# 46. WORKFORCE MANAGEMENT

Manage:

* Employees
* Departments
* Roles
* Shifts
* Operators
* Helpers
* Machine assignments
* Production assignments

Support configurable manpower rules.

Examples:

```text
3–4 Looms → 1 Operator
```

```text
1 Printing Machine → 1 Operator + 2 Helpers
```

These rules must remain configurable.

---

# 47. FINISHED GOODS MODULE

After final production and quality approval:

```text
Finished Bags
 ↓
Segregation
 ↓
Approved
 ↓
Baling
 ↓
Finished Goods
```

Track:

* Product
* Characteristics
* Quantity
* Bale count
* Production batch
* Quality status
* Storage location
* Customer/order allocation

---

# 48. BALING MODULE

Track:

* Number of bags per bale
* Bale identity
* Product
* Characteristics
* Production batch
* Quantity
* Date
* Shift
* Quality status

---

# 49. DISPATCH & LOADING MODULE

Flow:

```text
Finished Goods
 ↓
Dispatch Requirement
 ↓
Stock Reservation
 ↓
Truck
 ↓
Loading
 ↓
Verification
 ↓
Gate Out
```

Track:

* Customer
* Product
* Characteristics
* Quantity
* Bale count
* Truck
* Driver
* Loading
* Dispatch
* Destination
* Time
* Status

---

# 50. CROSS-MODULE INTEGRATION

Modules remain independently usable but connected.

### Security → Inventory

Truck unloads material.

Security records receipt.

Inventory receives stock transaction.

### Production → Inventory

Production consumes materials.

Inventory decreases.

Production creates output.

Inventory receives output.

### Production → Quality

Production submits output.

Quality evaluates it.

### Quality → Inventory

Approved output becomes usable stock.

Rejected output becomes hold/rework/scrap.

### Production → Maintenance

Machine breakdown is reported.

Maintenance resolves it.

### Production → RP

Scrap is transferred to RP.

RP produces recycled granules.

### Finished Goods → Dispatch

Dispatch reserves and loads approved finished stock.

---

# 51. MATERIAL TRACEABILITY

Every important material should be traceable through its lifecycle.

Example:

```text
Raw Material Batch
 ↓
Bobbin
 ↓
Loom
 ↓
Roll
 ↓
Lamination
 ↓
Printed Roll
 ↓
Cut Material
 ↓
Finished Bag
 ↓
Bale
 ↓
Dispatch
```

The system should support both:

### Backward Traceability

Finished bale → original raw material.

### Forward Traceability

Raw material → final dispatched product.

---

# 52. CENTRAL MANAGEMENT DASHBOARD

Management should see:

## Production

* Today's target
* Actual
* Achievement
* Phase-wise production
* Shift-wise production
* Machine-wise production
* Delayed production

## Inventory

* Raw material
* Bobbin
* Rolls
* WIP
* Finished goods
* Scrap
* RP granules

## Quality

* Passed
* Failed
* Rework
* Hold
* Rejection rate

## Machines

* Running
* Idle
* Breakdown
* Maintenance

## Security

* Trucks inside
* Waiting
* Loading
* Unloading
* Gate-out

## Dispatch

* Ready
* Loading
* Dispatched
* Pending

---

# 53. REPORTING

## Production Reports

* Daily
* Shift-wise
* Phase-wise
* Machine-wise
* Product-wise
* Operator-wise
* Planned vs actual

## Inventory Reports

* Current stock
* Stock movement
* Material consumption
* WIP
* Finished goods
* Shortage

## Quality Reports

* QC results
* Rejection
* Rework
* Defects
* Quality trends

## Machine Reports

* Production
* Downtime
* Breakdown
* Maintenance history

## RP Reports

* Scrap received
* Scrap by phase
* Recycling
* RP granules produced

## Security Reports

* Truck entries
* Waiting time
* Loading/unloading
* Document verification
* Gate movements

## Dispatch Reports

* Customer
* Product
* Quantity
* Truck
* Date
* Pending dispatch

---

# 54. NOTIFICATIONS & ALERTS

The system should generate relevant alerts for:

* Missing documents
* Unverified documents
* Truck waiting too long
* Production below target
* Material shortage
* Incorrect production characteristics
* Quality failure
* High rejection
* High scrap
* Machine breakdown
* Excessive downtime
* Pending approval
* Finished goods ready for dispatch
* Dispatch delay

Users only receive notifications relevant to their permissions.

---

# 55. APPROVALS

Configurable approval workflows should support:

* Production plan approval
* Production plan modification
* Material adjustment
* QC release
* Rework approval
* Scrap approval
* Inventory adjustment
* Dispatch approval
* Configuration changes

Management should decide which activities require approval.

---

# 56. SEARCH & FILTERING

Every major module should support appropriate search/filtering.

Common filters:

* Date
* Shift
* Status
* Machine
* Phase
* Product
* Material
* Batch
* Roll
* Truck
* Customer
* Supplier
* Employee

---

# 57. OFFLINE OPERATION

The factory-facing applications must be capable of continuing operations when connectivity is unavailable.

The offline environment should allow authorized users to perform permitted operational activities.

When connectivity returns:

```text
Local Transaction
 ↓
Sync Queue
 ↓
Cloud System
 ↓
Confirmation
```

The system must prevent duplicate transactions during synchronization.

The central system remains the authoritative business record.

---

# 58. WEB / PWA EXPERIENCE

The Central CRM must be responsive and usable as:

* Desktop website
* Tablet
* Mobile
* Installable PWA

Users should not need a completely separate web application for mobile use.

---

# 59. ELECTRON DESKTOP EXPERIENCE

Factory computers can use the same CRM experience as a dedicated desktop application.

The desktop version should support:

* Offline operation
* Local data
* Sync
* Factory peripherals where required
* Printing
* Scanning
* Camera/document capture where applicable

It should behave as a **replica of the central CRM**, not a separate ERP.

---

# 60. VERSION & RELEASE MANAGEMENT

The desktop application should have controlled versions.

Management/administration should be able to identify:

* Installed version
* Latest available version
* Update status
* Release history

Releases should be centrally maintained and distributed to factory devices.

---

# 61. SECURITY PRINCIPLES

The system should enforce:

* User authentication
* RBAC
* Module permissions
* Feature permissions
* Action permissions
* Authorized approvals
* Audit logging
* Session control
* Access restriction
* Data visibility according to role

No user should automatically gain access to another department's data simply because they are an employee.

---

# 62. EXAMPLE — COMPLETE AMBUJA PRODUCTION

Management creates a production requirement:

```text
Product: Cement Bag
Brand: Ambuja
Roll Type: LPP
Colour: Yellow
Printing: Ambuja
Quantity: 100,000 bags
```

The production plan determines the required phases.

Raw material is available/received.

Bobbin production creates required bobbins.

Bobbins are allocated to looms.

Looms produce the required roll stock.

Rolls undergo required quality checks.

If required, rolls undergo lamination.

Printing receives:

```text
Shift A
LPP
Yellow
Ambuja
Target: X
```

Printed rolls are produced.

Rolls move to cutting.

Cut material moves to the appropriate finishing route:

* Convertex
* Valvomatic
* BCS
* Manual Stitching

Finished bags are inspected and segregated.

Approved bags are baled.

Bales enter Finished Goods.

Dispatch reserves the required stock.

Truck enters through Security.

Documents are verified.

Truck waits/parks.

Truck is loaded.

Dispatch is completed.

Truck exits.

Any scrap generated throughout the process is recorded and routed to RP where applicable.

---

# 63. EXCEPTION HANDLING

The system must support situations such as:

### Truck document rejected

→ Truck placed on hold/rejected.

### Actual unloading quantity differs

→ Difference recorded for review.

### Material fails QC

→ Material placed on hold/rejected.

### Machine breaks down

→ Production paused and Maintenance notified.

### Production differs from planned characteristics

→ Deviation recorded and appropriate authorization requested.

### Production target not completed

→ Remaining quantity transferred to the next shift/plan.

### Finished goods fail QC

→ Rework/rejection decision.

### Excess scrap

→ Alert to responsible management.

### Network unavailable

→ Factory application continues offline and synchronizes later.

---

# 64. BUSINESS RULES

1. Every truck entering the factory must have a Gate Entry.
2. Every truck must have a defined purpose: loading or unloading.
3. Required documents must be verified according to configured rules.
4. Unloading creates an inventory-receipt transaction after quantity confirmation.
5. Loading is connected to finished-goods/dispatch movement.
6. Production must be linked to a shift.
7. Production may be linked to a machine and responsible workforce.
8. Production characteristics can be different for every phase and shift.
9. Actual production must be compared with the approved plan.
10. Quality status determines whether material can proceed.
11. Rework must remain traceable.
12. Scrap must be recorded.
13. Recyclable scrap can be transferred to RP.
14. RP granules become a traceable material.
15. Finished goods must be approved before normal dispatch.
16. All important changes must be auditable.
17. Users only access permitted modules/actions.
18. Offline transactions must synchronize without duplication.
19. Central records remain the authoritative business records.

---

# 65. KEY MANAGEMENT QUESTIONS THE SYSTEM MUST ANSWER

At any time management should be able to determine:

### Security

* Which trucks are inside?
* Which are waiting?
* Which are loading/unloading?
* Which documents are pending?
* Which trucks have exited?

### Production

* What should we produce?
* What is being produced?
* What was actually produced?
* Which shift produced it?
* Which machine produced it?
* Which characteristics were required?

### Inventory

* What material do we have?
* Where is it?
* What was consumed?
* What is available?

### Quality

* What passed?
* What failed?
* What requires rework?

### Machines

* What is running?
* What is down?
* Why is it down?

### Scrap

* Where did scrap originate?
* How much was generated?
* How much went to RP?
* How much RP granule was recovered?

### Dispatch

* What is ready?
* What is loaded?
* What has been dispatched?

### Traceability

* Where did this finished product come from?
* Where did this raw material go?

---

# 66. MVP IMPLEMENTATION ORDER

The functional rollout should follow the actual dependency chain.

### Phase 1 — Foundation

1. Central CRM
2. Settings
3. Users
4. Roles
5. Module access
6. Permissions
7. Logs/Audit
8. Notifications

### Phase 2 — Factory Entry

9. Security/Gate
10. Truck management
11. Document verification
12. Parking/waiting
13. Loading/unloading

### Phase 3 — Materials

14. Inventory
15. Raw material receiving
16. Stock movements
17. Material batches
18. Bobbin stock
19. Roll stock

### Phase 4 — Production

20. Shift planning
21. Production characteristics
22. Bobbin production
23. Loom production
24. Lamination
25. Printing
26. Cutting
27. Finishing
28. Baling

### Phase 5 — Control

29. Quality
30. Rework
31. Scrap
32. RP/Recycling
33. Machine management
34. Maintenance

### Phase 6 — Commercial Operations

35. Finished goods
36. Dispatch
37. Loading
38. Reports
39. Management dashboards

---

# 67. FINAL SYSTEM MODEL

The complete system should ultimately operate as:

```text
                    CENTRAL CRM
                         │
               SETTINGS / USERS / RBAC
                         │
                    LOGS / AUDIT
                         │
 ┌──────────┬───────────┼───────────┬───────────┐
 │          │           │           │           │
SECURITY  INVENTORY  PRODUCTION  QUALITY  MAINTENANCE
 │          │           │           │           │
 │          │           │           │           │
 │          │       ┌───┴────┐      │           │
 │          │       │        │      │           │
 │          │    SHIFT   CHARACTER. │           │
 │          │       │        │      │           │
 │          │       └───┬────┘      │           │
 │          │           ↓            │           │
 │          │       MANUFACTURING    │           │
 │          │           │            │           │
 │          └───────────┼────────────┘           │
 │                      │                        │
 │                   SCRAP                       │
 │                      ↓                        │
 │                     RP                        │
 │                      │                        │
 │                      ↓                        │
 │                 RP GRANULES                    │
 │                                               │
 └──────────────────────┬────────────────────────┘
                        ↓
                  FINISHED GOODS
                        ↓
                    DISPATCH
                        ↓
                     TRUCK
                        ↓
                    GATE OUT
```

# 68. Product Definition

The final product is not simply an ERP.

It is a:

> **Centralized, modular manufacturing CRM/ERP that digitally represents the complete factory operation, from truck entry and material receiving through multi-stage production, quality, inventory, recycling, finished goods and dispatch, while allowing management to control every operation through configurable roles, permissions, shifts and production characteristics.**

The fundamental operational cycle is:

```text
PLAN
 ↓
ASSIGN
 ↓
PRODUCE
 ↓
CHECK
 ↓
RECORD
 ↓
MOVE
 ↓
RECYCLE / REWORK WHERE REQUIRED
 ↓
FINISH
 ↓
STORE
 ↓
DISPATCH
 ↓
TRACE
```

Every important activity remains connected, permission-controlled and auditable.
