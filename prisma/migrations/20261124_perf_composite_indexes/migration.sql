-- Additive Performance Indexes (ERP Performance Optimization Audit)
-- Non-destructive, idempotent index creation for high-frequency scan queries

-- NextAuth Account & Session lookups by user ID
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- Inventory Batch foreign key to GateEntry
CREATE INDEX IF NOT EXISTS "InventoryBatch_gateEntryId_idx" ON "InventoryBatch"("gateEntryId");

-- Gate Status Log timeline and status filtering
CREATE INDEX IF NOT EXISTS "GateStatusLog_status_idx" ON "GateStatusLog"("status");
CREATE INDEX IF NOT EXISTS "GateStatusLog_createdAt_idx" ON "GateStatusLog"("createdAt");

-- Machine operational status and active state
CREATE INDEX IF NOT EXISTS "Machine_status_idx" ON "Machine"("status");
CREATE INDEX IF NOT EXISTS "Machine_isActive_idx" ON "Machine"("isActive");

-- Tape Plant Plan status and status+date composite filtering
CREATE INDEX IF NOT EXISTS "TapePlantPlan_status_idx" ON "TapePlantPlan"("status");
CREATE INDEX IF NOT EXISTS "TapePlantPlan_status_date_idx" ON "TapePlantPlan"("status", "date");

-- Tape Plant Temperature Reading chronological lookup
CREATE INDEX IF NOT EXISTS "TapePlantTemperatureReading_createdAt_idx" ON "TapePlantTemperatureReading"("createdAt");

-- Role Permission module-level lookups
CREATE INDEX IF NOT EXISTS "RolePermission_module_idx" ON "RolePermission"("module");

-- Idempotency Record recovery scanning
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_status_createdAt_idx" ON "IdempotencyRecord"("status", "createdAt");
