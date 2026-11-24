-- Additive Enterprise Idempotency and Background Job Persistence (ERP-004, ERP-023)
-- Safe, additive migration without dropping or altering any existing production tables.

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "statusCode" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_key_userId_endpoint_key" 
ON "IdempotencyRecord"("key", "userId", "endpoint");

CREATE INDEX IF NOT EXISTS "IdempotencyRecord_expiresAt_idx" 
ON "IdempotencyRecord"("expiresAt");

CREATE TABLE IF NOT EXISTS "BackgroundJobRecord" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BackgroundJobRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BackgroundJobRecord_status_idx" 
ON "BackgroundJobRecord"("status");

CREATE INDEX IF NOT EXISTS "BackgroundJobRecord_createdById_idx" 
ON "BackgroundJobRecord"("createdById");
