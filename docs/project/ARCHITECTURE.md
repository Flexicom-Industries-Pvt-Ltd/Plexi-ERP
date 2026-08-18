# Plascom ERP Architecture

## 1. Core Principles
* **Single Centralized System:** Do NOT use microservices. Do NOT create separate backend services or databases per module.
* **One Central CRM:** The web interface is a monolithic Next.js application containing all logically independent modules.
* **One Central Database:** A single PostgreSQL database acting as the central source of truth.
* **Electron Replicated Client:** A factory-floor Electron app for offline-first operation. It replicates the core logic and syncs with the central Postgres database.

## 2. Technology Stack
* **Frontend/Backend:** Next.js with TypeScript
* **Database:** PostgreSQL (Centralized cloud instance)
* **Hosting:** Vercel
* **Offline App:** Electron + Local DB (for offline-first factory operation)
* **File Storage:** AWS S3 (for Electron releases and uploaded documents)
* **CI/CD:** GitHub Actions

## 3. The Electron Component
The Electron application is NOT a second, different ERP. It is an offline-capable execution environment for the Central CRM.
* It operates on a local database when disconnected.
* It must safely synchronize local transactions with the central PostgreSQL database without duplication.
* Sync logic must resolve conflicts and ensure the central database remains authoritative.

## 4. Module Boundaries
Modules are logically independent (e.g., Security, Inventory, Production) but reside in the same codebase.
* All modules share the same Authentication, RBAC, Logging, and Database.
* Strict domain boundaries must be maintained within the codebase to prevent spaghetti code.

## 5. Definition of Done
A feature is only complete when:
- Requirement is implemented with relevant UI.
- Validation, Error states, and Empty states are handled.
- RBAC is correctly applied.
- Audit logging is triggered appropriately.
- Database migrations are complete.
- Relevant tests are passing.
- Offline behavior and Sync logic are handled (if applicable).
- Documentation is updated.
