# [P3] HR & Time Office: Biometric Attendance Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an end-to-end, Real-Time HR & Attendance (Time Office) module in Plexi-ERP that ingests biometric logs automatically from the TimeWatch iDMS API (`GetPunchData`, `GetUserDetails`, `GetDeviceList`) via webhooks and continuous background polling, pulls dynamic shift timings directly from Settings, supports Excel/CSV punch import with sample template downloads for offline fallback, displays daily attendance registers and raw punch logs, enables comprehensive exports (Excel/CSV), and feeds shift headcount directly into factory production modules (Requirements `H-01`, `H-02`, `H-03`, `H-04`, `X-01`).

**Architecture:** 
1. **Dynamic Shift Configuration (Zero Hardcoding):** 
   - Shift start/end times, names, grace periods, and work-hour rules are retrieved dynamically from the `Shift` model and `ConfigParameter` table.
   - Any adjustment in Settings takes effect immediately across all calculations.
2. **Automated Real-Time Sync Pipeline (No "Sync Now" button):**
   - Inbound webhook (`POST /api/hr/webhook/punch`) for instant push events from the factory bridge.
   - Background worker/cron (`/api/cron/biometric-sync`) polling every 60s for newly created records.
   - Frontend live stream / auto-revalidation updating KPIs and tables in real-time as workers punch in at the gate.
3. **Data Layer (Prisma & PostgreSQL):** 
   - `Module.HR` added to RBAC permissions.
   - `BiometricDevice`: Stores physical device metadata, IP, status, user & face counts from `GetDeviceList`.
   - `AttendancePunch`: Immutable raw punch stream with device ID, user ID, punch timestamp, verification method, direction (`IN`/`OUT`/`AUTO`), and sync source (`API_REALTIME`, `API_POLL`, `EXCEL_IMPORT`, `MANUAL`).
   - `DailyAttendance`: Computed daily attendance record per employee (First In, Last Out, Total Hours, OT, Status: `PRESENT`, `ABSENT`, `HALF_DAY`, `LATE`, `ON_DUTY`).
   - `ShiftHeadcount`: Section-wise shift attendance roll (Loom, Tape Plant, Lamination, Printing, Convertex, Valvomatic) that provides headcount directly to floor shift handovers.
4. **Integration & Ingestion Service (`src/lib/hr`):**
   - `TimeWatchClient`: HTTP client communicating with TimeWatch iDMS API with configurable base URL, `X-Api-Key`, error handling, and offline/mock simulator when factory LAN is unreachable.
   - `AttendanceImportService`: Parses `.xlsx`/`.csv` attendance logs, validates records, handles employee mapping, rejects corrupt timestamps, and prevents duplicate punches.
   - `AttendanceExportService`: Generates professional Excel sheets (Daily Register, Punch Logs, Monthly Muster Roll, Section Headcount, and Sample Import Template) using `xlsx`.
   - `AttendanceProcessor`: Computes work durations against dynamic shifts, determines In/Out pairings, checks late arrivals against company rules (e.g. grace period 15 mins), and marks absent/half-day.
5. **API Routes (`src/app/api/hr/*`):**
   - `GET /api/hr/attendance`: Paginated & filtered daily attendance list.
   - `GET /api/hr/punches`: Raw biometric punch stream.
   - `POST /api/hr/webhook/punch`: Inbound real-time push webhook.
   - `GET /api/cron/biometric-sync`: Automated background poller cron.
   - `POST /api/hr/import`: Handle Excel/CSV file upload and batch upsert.
   - `GET /api/hr/devices`: Fetch biometric device statuses.
   - `GET /api/hr/template`: Download sample Excel import template.
   - `GET /api/hr/headcount`: Live shift headcount by department for production handovers.
6. **UI Layer (`src/app/(dashboard)/dashboard/hr/*`):**
   - Tab 1: **Daily Attendance Register** (Live status badge, dynamic shift filters, status badges, regularize dialog, export buttons).
   - Tab 2: **Biometric Raw Logs** (Audit log table mirroring TimeWatch `GetPunchData` output).
   - Tab 3: **Device Management** (Live biometric machines from `GetDeviceList`, online/offline badges, IP, sync stats).
   - Tab 4: **Shift Headcount** (Section-wise headcount breakdown feeding `H-04` & `X-01`).
   - **Excel Import Modal**: Drag-and-drop Excel file upload with immediate data validation preview and sample template download.

**Tech Stack:** Next.js 16 (App Router), Prisma ORM, PostgreSQL (Neon), TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons, `xlsx` for Excel generation and parsing.
