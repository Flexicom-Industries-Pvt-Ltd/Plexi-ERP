# Development TODO Tracker

**Project Progress**: Inception
**Current Phase**: Phase 0 — Project Foundation
**Current Module**: Infrastructure & Foundation

## Phase 0 — Project Foundation (In Progress)

- [ ] P0 — Repository structure & Next.js initialization
- [ ] P0 — Development/staging/production environment configuration
- [ ] P0 — Central PostgreSQL database setup & schema foundation
- [ ] P0 — ORM setup & migrations foundation
- [ ] P0 — Global authentication foundation
- [ ] P0 — Session management
- [ ] P0 — Central RBAC foundation
- [ ] P0 — Global error handling & validation
- [ ] P0 — Central logging & audit foundation
- [ ] P0 — Notification foundation
- [ ] P0 — File & document handling foundation (S3)
- [ ] P0 — Common UI components (tables, forms, dialogs)
- [ ] P0 — Common layouts
- [ ] P0 — Common configurable status system
- [ ] P0 — Common ID & transaction ID strategy (Correlation IDs)
- [ ] P0 — Common API & action conventions
- [ ] P0 — Testing foundation
- [ ] P0 — GitHub Actions CI/CD setup

## Phase 1 — Settings Module (Pending)
*Dependency: Phase 0 Completion*

- [ ] P1 — Organization & factory configuration
- [ ] P1 — Departments
- [ ] P1 — Sections & Production phases
- [ ] P1 — Factory & Storage locations
- [ ] P1 — Shifts
- [ ] P1 — Units of measurement
- [ ] P1 — Material & Product categories
- [ ] P1 — Configurable statuses
- [ ] P1 — Configurable system parameters
- [ ] P1 — Machine master data

## Phase 2 — User & RBAC (Pending)
*Dependency: Phase 0 Completion*

- [ ] P0 — Create user
- [ ] P0 — Edit user & Activate/Deactivate
- [ ] P1 — User profile (Employee ID, Dept, Designation)
- [ ] P0 — Role assignment & Module assignment
- [ ] P0 — Create role, Edit role, Delete/Deactivate role
- [ ] P0 — Assign permissions & View role permissions
- [ ] P0 — Module-level, Feature-level, and Action-level permissions
- [ ] P2 — User-specific permission overrides

## Phase 3 — Log & Audit Module (Pending)
*Dependency: Phase 0 Completion*

- [ ] P0 — Authentication tracking (Logins, session expiry, password resets)
- [ ] P0 — User/RBAC tracking (Role changes, permission updates)
- [ ] P0 — Request/API tracking (Correlation ID, HTTP method, URL, duration, status)
- [ ] P0 — Business Audit (Create, Update, Delete, Verify, Status changes)
- [ ] P0 — Data Audit (Record ID, previous value, new value, changed fields)
- [ ] P0 — Security Event tracking (Unauthorized access, lockouts)
- [ ] P1 — Device Information tracking (Browser, OS, Electron vs PWA)
- [ ] P0 — Offline/Sync tracking (Local vs Cloud IDs, retry counts, conflicts)
- [ ] P1 — File handling tracking (Upload, Download, Replace)
- [ ] P0 — System Error tracking (Exceptions, failed integrations)
- [ ] P1 — Log Management (Search, filtering by severity, user, module, correlation ID)
- [ ] P0 — Strict Payload Redaction (Masking passwords, secrets, tokens)

## Phase 4 — Module 1: Security & Gate Management (Pending)
*Dependency: Phase 0, 1, 2, 3 Completion*

- [ ] P0 — TRUCK ENTRY: Unique Gate Entry ID generation
- [ ] P0 — TRUCK ENTRY: Capture truck details (No., Driver, Transporter, Purpose)
- [ ] P0 — STOCK DETAILS: Support multiple material/stock items per truck
- [ ] P0 — DOCUMENTS: Upload and Status lifecycle (Pending -> Under Verification -> Verified/Rejected)
- [ ] P0 — TRUCK STATUS: Lifecycle management (Arrived -> Verified -> Waiting -> Loading/Unloading -> Completed -> Gate Out)
- [ ] P1 — PARKING/WAITING: Queue management & waiting time tracking
- [ ] P0 — UNLOADING: Material confirmation, quantity matching, inventory transaction creation
- [ ] P0 — LOADING: Finished goods confirmation, bale count, dispatch connection
- [ ] P0 — GATE OUT: Final verification, timestamp, Gate Entry closure
- [ ] P1 — SECURITY DASHBOARD: Real-time view of all trucks inside and their status

---

*Note: All tasks must pass the global Definition of Done (Tests, Validation, RBAC, Audit, UI, Offline sync handling).*
