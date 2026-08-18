# Project Roadmap - Plascom ERP

## Phase 0: Project Foundation (Current)
Goal: Establish the technical foundation for the Central CRM/ERP. No business logic modules should be built until these are complete.
- Repository initialization & structure
- Next.js & TypeScript setup
- Database & ORM setup
- Authentication & RBAC foundation
- Logging & Audit foundation

## Phase 1: Settings Module
Goal: Build the configuration foundation that future modules will depend on.
- Organization & factory config
- Departments, shifts, phases
- Statuses and system parameters

## Phase 2: Users & RBAC
Goal: Robust user and role management system to restrict access per module and feature.
- User management
- Role management
- Module, feature, and action level permissions

## Phase 3: Log & Audit Module
Goal: Comprehensive, system-wide logging with correlation IDs.
- Request & API logging
- Business audit & Data audit
- Security & System logging

## Phase 4: Security & Gate Management (Module 1)
Goal: The first operational module covering end-to-end truck entry and dispatch.
- Gate Entry
- Document verification
- Unloading / Loading connection
- Gate Out

## Phase 5+: Future Modules
- Inventory & Materials
- Production Cycle (Bobbin, Loom, Lamination, Printing, Cutting, Finishing)
- Quality Control
- Machine Management & Maintenance
- Recycling Plant (RP)
- Finished Goods & Dispatch
