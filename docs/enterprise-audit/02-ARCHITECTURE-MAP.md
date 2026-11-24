# Plexi-ERP Architecture Map & Component Topology

## 1. System Topology Overview

```mermaid
graph TD
    subgraph Clients
        WebBrowser["Web Browser (Next.js 16 App Router)"]
        ElectronDesktop["Electron Desktop Shell (Frameless Windows App)"]
        BiometricDevice["TimeWatch iDMS Device (Factory LAN / Webhook)"]
    end

    subgraph Edge & Ingestion
        NextProxy["Next.js Proxy / Route Middleware (`src/proxy.ts`)"]
        RateLimiter["Rate Limiting (`src/lib/rate-limit.ts`)"]
        AuthMiddleware["Auth & Session Check (`src/auth.ts`, `src/lib/api-auth.ts`)"]
    end

    subgraph Application Core
        ServerActions["Server Actions (`src/actions/*`)"]
        APIRoutes["API Route Handlers (`src/app/api/*`)"]
        DomainServices["Domain Services (`src/services/*`)"]
        ProductionBus["Real-Time SSE Production Bus (`src/lib/realtime/production-bus.ts`)"]
        TaskQueue["Background Task Queue (`src/lib/queue/task-queue.ts`)"]
    end

    subgraph Data & Persistence Layer
        DBPool["Neon / Postgres Connection Pool (`src/lib/db.ts`)"]
        PrismaORM["Prisma Client v7.10.0"]
        PostgresDB[("PostgreSQL 16 Database")]
        AWSS3[("AWS S3 Object Storage (Evidence Photos / Slips)")]
        LocalCache["In-Memory Cache & Mutex (`src/lib/cache.ts`, `src/lib/concurrency-lock.ts`)"]
    end

    WebBrowser --> NextProxy
    ElectronDesktop --> NextProxy
    BiometricDevice --> APIRoutes

    NextProxy --> AuthMiddleware
    AuthMiddleware --> RateLimiter
    RateLimiter --> ServerActions
    RateLimiter --> APIRoutes

    ServerActions --> DomainServices
    APIRoutes --> DomainServices

    DomainServices --> ProductionBus
    DomainServices --> TaskQueue
    DomainServices --> PrismaORM
    DomainServices --> LocalCache

    PrismaORM --> DBPool
    DBPool --> PostgresDB
    DomainServices --> AWSS3
```

## 2. Core Functional Modules
1. **Security & Gate Management**: Visitor, truck entry, tare/gross weighing, camera photo verification, gate pass issuance.
2. **Inventory Management**: Raw materials receiving, stock allocation, batch/lot tracking, unit of measure conversions.
3. **Production Routes**:
   - **Tape Plant**: Granule mixture formulation, extruder parameters, tape denier/width calculation, bobbin production.
   - **Loom Section**: Circular loom weaving, roll cutting, fabric quality grading (Grade A/B/C/Rework), reading sheets.
   - **Lamination**: Extrusion coating, micron thickness, raw material consumption.
   - **Printing**: Flexographic printing, ink and solvent tracking, cylinder repeat lengths.
   - **Cutting & Bag Conversion**: Convertex & Valvomatic valve bag conversion, bottom stitching, baling.
4. **Quality Control & Rework**: Non-conformance logging, scrap attribution, RP recycling plant reprocessing.
5. **Commercial & Dispatch**: Finished goods warehouse, lot picking, invoice and packing slip generation.
6. **HR & Attendance**: TimeWatch biometric device synchronization, shift attribution (Shift A, B, C, Day/Night), attendance daily aggregations.
