-- AlterEnum
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'DATA_CENTRE';
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'FINISHED_GOODS';
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'RECYCLING_PLANT';
ALTER TYPE "Module" ADD VALUE IF NOT EXISTS 'MAINTENANCE';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "QcReferenceType" AS ENUM ('ROLL', 'BALE', 'PRODUCTION_RUN', 'BATCH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QcDecision" AS ENUM ('PASSED', 'FAILED', 'REWORK', 'ON_HOLD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QcInspectionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "QcReworkStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScrapSourceType" AS ENUM ('QC_INSPECTION', 'PRODUCTION_RUN', 'ROLL', 'BALE', 'MANUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RecyclingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MaintenanceType" AS ENUM ('BREAKDOWN', 'PREVENTATIVE', 'ROUTINE_SERVICE', 'INSPECTION', 'CALIBRATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FinishedGoodsStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ALLOCATED', 'DISPATCHED', 'ON_HOLD', 'SCRAPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DispatchOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PICKING', 'LOADED', 'DISPATCHED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DispatchAllocationStatus" AS ENUM ('ALLOCATED', 'LOADED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable InventoryItem
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "reservedStock" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable: QcInspection
CREATE TABLE IF NOT EXISTS "QcInspection" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "referenceType" "QcReferenceType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "status" "QcInspectionStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "QcDecision",
    "inspectorId" TEXT,
    "notes" TEXT,
    "defectReason" TEXT,
    "reworkInstructions" TEXT,
    "samplesInspected" INTEGER NOT NULL DEFAULT 1,
    "parameters" JSONB,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QcInspectionLine
CREATE TABLE IF NOT EXISTS "QcInspectionLine" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "standardValue" TEXT,
    "actualValue" TEXT NOT NULL,
    "unit" TEXT,
    "status" "QcDecision" NOT NULL DEFAULT 'PASSED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcInspectionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QcReworkTicket
CREATE TABLE IF NOT EXISTS "QcReworkTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "inspectionId" TEXT,
    "sourceReferenceType" "QcReferenceType" NOT NULL,
    "sourceReferenceId" TEXT NOT NULL,
    "targetPhase" TEXT NOT NULL,
    "status" "QcReworkStatus" NOT NULL DEFAULT 'OPEN',
    "defectReason" TEXT,
    "reworkInstructions" TEXT,
    "assignedOperatorId" TEXT,
    "completedById" TEXT,
    "reworkQty" DOUBLE PRECISION,
    "reworkCost" DOUBLE PRECISION,
    "notes" TEXT,
    "reworkCompletedAt" TIMESTAMP(3),
    "reInspectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QcReworkTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ScrapRecord
CREATE TABLE IF NOT EXISTS "ScrapRecord" (
    "id" TEXT NOT NULL,
    "scrapNumber" TEXT NOT NULL,
    "sourceType" "ScrapSourceType" NOT NULL DEFAULT 'QC_INSPECTION',
    "sourceId" TEXT,
    "phase" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "inventoryItemId" TEXT,
    "locationId" TEXT,
    "inventoryTransactionId" TEXT,
    "recyclingBatchId" TEXT,
    "isRecycled" BOOLEAN NOT NULL DEFAULT false,
    "recordedById" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RecyclingBatch
CREATE TABLE IF NOT EXISTS "RecyclingBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "inputScrapQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputRpQty" DOUBLE PRECISION,
    "wasteLossQty" DOUBLE PRECISION,
    "granuleGrade" TEXT,
    "status" "RecyclingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "outputItemId" TEXT,
    "outputLocationId" TEXT,
    "operatorId" TEXT,
    "inventoryTransactionId" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecyclingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MaintenanceLog
CREATE TABLE IF NOT EXISTS "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "logNumber" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL DEFAULT 'BREAKDOWN',
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "downtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION,
    "reportedById" TEXT,
    "assignedTechnicianId" TEXT,
    "resolvedById" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "correctiveAction" TEXT,
    "partsReplaced" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FinishedGoodsLot
CREATE TABLE IF NOT EXISTS "FinishedGoodsLot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "baleId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allocatedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'bags',
    "productionBatch" TEXT,
    "grossWeight" DOUBLE PRECISION,
    "netWeight" DOUBLE PRECISION,
    "qualityStatus" "RollQualityStatus" NOT NULL DEFAULT 'PASSED',
    "status" "FinishedGoodsStatus" NOT NULL DEFAULT 'AVAILABLE',
    "locationId" TEXT,
    "inventoryTransactionId" TEXT,
    "notes" TEXT,
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinishedGoodsLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DispatchOrder
CREATE TABLE IF NOT EXISTS "DispatchOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT,
    "customerAddress" TEXT,
    "status" "DispatchOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "gateEntryId" TEXT,
    "transporter" TEXT,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "totalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatchedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "loadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DispatchOrderLine
CREATE TABLE IF NOT EXISTS "DispatchOrderLine" (
    "id" TEXT NOT NULL,
    "dispatchOrderId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "orderedQty" DOUBLE PRECISION NOT NULL,
    "pickedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loadedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'bags',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DispatchAllocation
CREATE TABLE IF NOT EXISTS "DispatchAllocation" (
    "id" TEXT NOT NULL,
    "dispatchOrderLineId" TEXT NOT NULL,
    "finishedGoodsLotId" TEXT NOT NULL,
    "allocatedQty" DOUBLE PRECISION NOT NULL,
    "loadedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DispatchAllocationStatus" NOT NULL DEFAULT 'ALLOCATED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchAllocation_pkey" PRIMARY KEY ("id")
);

-- Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "QcInspection_inspectionNumber_key" ON "QcInspection"("inspectionNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "QcReworkTicket_ticketNumber_key" ON "QcReworkTicket"("ticketNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "ScrapRecord_scrapNumber_key" ON "ScrapRecord"("scrapNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "RecyclingBatch_batchNumber_key" ON "RecyclingBatch"("batchNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceLog_logNumber_key" ON "MaintenanceLog"("logNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "FinishedGoodsLot_lotNumber_key" ON "FinishedGoodsLot"("lotNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "DispatchOrder_orderNumber_key" ON "DispatchOrder"("orderNumber");

-- Indexes
CREATE INDEX IF NOT EXISTS "QcInspection_referenceType_referenceId_idx" ON "QcInspection"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS "QcInspection_status_idx" ON "QcInspection"("status");
CREATE INDEX IF NOT EXISTS "QcInspection_decision_idx" ON "QcInspection"("decision");
CREATE INDEX IF NOT EXISTS "QcInspection_inspectorId_idx" ON "QcInspection"("inspectorId");

CREATE INDEX IF NOT EXISTS "QcInspectionLine_inspectionId_idx" ON "QcInspectionLine"("inspectionId");
CREATE INDEX IF NOT EXISTS "QcInspectionLine_status_idx" ON "QcInspectionLine"("status");

CREATE INDEX IF NOT EXISTS "QcReworkTicket_inspectionId_idx" ON "QcReworkTicket"("inspectionId");
CREATE INDEX IF NOT EXISTS "QcReworkTicket_sourceReferenceType_sourceReferenceId_idx" ON "QcReworkTicket"("sourceReferenceType", "sourceReferenceId");
CREATE INDEX IF NOT EXISTS "QcReworkTicket_status_idx" ON "QcReworkTicket"("status");
CREATE INDEX IF NOT EXISTS "QcReworkTicket_targetPhase_idx" ON "QcReworkTicket"("targetPhase");
CREATE INDEX IF NOT EXISTS "QcReworkTicket_assignedOperatorId_idx" ON "QcReworkTicket"("assignedOperatorId");
CREATE INDEX IF NOT EXISTS "QcReworkTicket_createdAt_idx" ON "QcReworkTicket"("createdAt");

CREATE INDEX IF NOT EXISTS "ScrapRecord_sourceType_sourceId_idx" ON "ScrapRecord"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "ScrapRecord_phase_idx" ON "ScrapRecord"("phase");
CREATE INDEX IF NOT EXISTS "ScrapRecord_reasonCode_idx" ON "ScrapRecord"("reasonCode");
CREATE INDEX IF NOT EXISTS "ScrapRecord_inventoryItemId_idx" ON "ScrapRecord"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "ScrapRecord_locationId_idx" ON "ScrapRecord"("locationId");
CREATE INDEX IF NOT EXISTS "ScrapRecord_recordedById_idx" ON "ScrapRecord"("recordedById");
CREATE INDEX IF NOT EXISTS "ScrapRecord_recordedAt_idx" ON "ScrapRecord"("recordedAt");
CREATE INDEX IF NOT EXISTS "ScrapRecord_recyclingBatchId_idx" ON "ScrapRecord"("recyclingBatchId");
CREATE INDEX IF NOT EXISTS "ScrapRecord_isRecycled_idx" ON "ScrapRecord"("isRecycled");

CREATE INDEX IF NOT EXISTS "RecyclingBatch_status_idx" ON "RecyclingBatch"("status");
CREATE INDEX IF NOT EXISTS "RecyclingBatch_outputItemId_idx" ON "RecyclingBatch"("outputItemId");
CREATE INDEX IF NOT EXISTS "RecyclingBatch_outputLocationId_idx" ON "RecyclingBatch"("outputLocationId");
CREATE INDEX IF NOT EXISTS "RecyclingBatch_operatorId_idx" ON "RecyclingBatch"("operatorId");
CREATE INDEX IF NOT EXISTS "RecyclingBatch_startedAt_idx" ON "RecyclingBatch"("startedAt");
CREATE INDEX IF NOT EXISTS "RecyclingBatch_completedAt_idx" ON "RecyclingBatch"("completedAt");

CREATE INDEX IF NOT EXISTS "MaintenanceLog_machineId_idx" ON "MaintenanceLog"("machineId");
CREATE INDEX IF NOT EXISTS "MaintenanceLog_type_idx" ON "MaintenanceLog"("type");
CREATE INDEX IF NOT EXISTS "MaintenanceLog_status_idx" ON "MaintenanceLog"("status");
CREATE INDEX IF NOT EXISTS "MaintenanceLog_priority_idx" ON "MaintenanceLog"("priority");
CREATE INDEX IF NOT EXISTS "MaintenanceLog_reportedById_idx" ON "MaintenanceLog"("reportedById");
CREATE INDEX IF NOT EXISTS "MaintenanceLog_assignedTechnicianId_idx" ON "MaintenanceLog"("assignedTechnicianId");
CREATE INDEX IF NOT EXISTS "MaintenanceLog_reportedAt_idx" ON "MaintenanceLog"("reportedAt");
CREATE INDEX IF NOT EXISTS "MaintenanceLog_resolvedAt_idx" ON "MaintenanceLog"("resolvedAt");

CREATE INDEX IF NOT EXISTS "FinishedGoodsLot_inventoryItemId_idx" ON "FinishedGoodsLot"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "FinishedGoodsLot_baleId_idx" ON "FinishedGoodsLot"("baleId");
CREATE INDEX IF NOT EXISTS "FinishedGoodsLot_locationId_idx" ON "FinishedGoodsLot"("locationId");
CREATE INDEX IF NOT EXISTS "FinishedGoodsLot_status_idx" ON "FinishedGoodsLot"("status");
CREATE INDEX IF NOT EXISTS "FinishedGoodsLot_qualityStatus_idx" ON "FinishedGoodsLot"("qualityStatus");
CREATE INDEX IF NOT EXISTS "FinishedGoodsLot_productionBatch_idx" ON "FinishedGoodsLot"("productionBatch");
CREATE INDEX IF NOT EXISTS "FinishedGoodsLot_receivedAt_idx" ON "FinishedGoodsLot"("receivedAt");

CREATE INDEX IF NOT EXISTS "DispatchOrder_status_idx" ON "DispatchOrder"("status");
CREATE INDEX IF NOT EXISTS "DispatchOrder_customerName_idx" ON "DispatchOrder"("customerName");
CREATE INDEX IF NOT EXISTS "DispatchOrder_gateEntryId_idx" ON "DispatchOrder"("gateEntryId");
CREATE INDEX IF NOT EXISTS "DispatchOrder_createdById_idx" ON "DispatchOrder"("createdById");
CREATE INDEX IF NOT EXISTS "DispatchOrder_dispatchedAt_idx" ON "DispatchOrder"("dispatchedAt");
CREATE INDEX IF NOT EXISTS "DispatchOrder_createdAt_idx" ON "DispatchOrder"("createdAt");

CREATE INDEX IF NOT EXISTS "DispatchOrderLine_dispatchOrderId_idx" ON "DispatchOrderLine"("dispatchOrderId");
CREATE INDEX IF NOT EXISTS "DispatchOrderLine_inventoryItemId_idx" ON "DispatchOrderLine"("inventoryItemId");

CREATE INDEX IF NOT EXISTS "DispatchAllocation_dispatchOrderLineId_idx" ON "DispatchAllocation"("dispatchOrderLineId");
CREATE INDEX IF NOT EXISTS "DispatchAllocation_finishedGoodsLotId_idx" ON "DispatchAllocation"("finishedGoodsLotId");
CREATE INDEX IF NOT EXISTS "DispatchAllocation_status_idx" ON "DispatchAllocation"("status");

-- Foreign Keys (with safety DO blocks)
DO $$ BEGIN
    ALTER TABLE "QcInspection" ADD CONSTRAINT "QcInspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "QcInspectionLine" ADD CONSTRAINT "QcInspectionLine_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "QcInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "QcReworkTicket" ADD CONSTRAINT "QcReworkTicket_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "QcInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "QcReworkTicket" ADD CONSTRAINT "QcReworkTicket_assignedOperatorId_fkey" FOREIGN KEY ("assignedOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "QcReworkTicket" ADD CONSTRAINT "QcReworkTicket_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ScrapRecord" ADD CONSTRAINT "ScrapRecord_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ScrapRecord" ADD CONSTRAINT "ScrapRecord_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ScrapRecord" ADD CONSTRAINT "ScrapRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ScrapRecord" ADD CONSTRAINT "ScrapRecord_inventoryTransactionId_fkey" FOREIGN KEY ("inventoryTransactionId") REFERENCES "InventoryTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ScrapRecord" ADD CONSTRAINT "ScrapRecord_recyclingBatchId_fkey" FOREIGN KEY ("recyclingBatchId") REFERENCES "RecyclingBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RecyclingBatch" ADD CONSTRAINT "RecyclingBatch_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RecyclingBatch" ADD CONSTRAINT "RecyclingBatch_outputLocationId_fkey" FOREIGN KEY ("outputLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RecyclingBatch" ADD CONSTRAINT "RecyclingBatch_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "RecyclingBatch" ADD CONSTRAINT "RecyclingBatch_inventoryTransactionId_fkey" FOREIGN KEY ("inventoryTransactionId") REFERENCES "InventoryTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FinishedGoodsLot" ADD CONSTRAINT "FinishedGoodsLot_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FinishedGoodsLot" ADD CONSTRAINT "FinishedGoodsLot_baleId_fkey" FOREIGN KEY ("baleId") REFERENCES "Bale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FinishedGoodsLot" ADD CONSTRAINT "FinishedGoodsLot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FinishedGoodsLot" ADD CONSTRAINT "FinishedGoodsLot_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FinishedGoodsLot" ADD CONSTRAINT "FinishedGoodsLot_inventoryTransactionId_fkey" FOREIGN KEY ("inventoryTransactionId") REFERENCES "InventoryTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_loadedById_fkey" FOREIGN KEY ("loadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_gateEntryId_fkey" FOREIGN KEY ("gateEntryId") REFERENCES "GateEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DispatchOrderLine" ADD CONSTRAINT "DispatchOrderLine_dispatchOrderId_fkey" FOREIGN KEY ("dispatchOrderId") REFERENCES "DispatchOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DispatchOrderLine" ADD CONSTRAINT "DispatchOrderLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DispatchAllocation" ADD CONSTRAINT "DispatchAllocation_dispatchOrderLineId_fkey" FOREIGN KEY ("dispatchOrderLineId") REFERENCES "DispatchOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "DispatchAllocation" ADD CONSTRAINT "DispatchAllocation_finishedGoodsLotId_fkey" FOREIGN KEY ("finishedGoodsLotId") REFERENCES "FinishedGoodsLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
