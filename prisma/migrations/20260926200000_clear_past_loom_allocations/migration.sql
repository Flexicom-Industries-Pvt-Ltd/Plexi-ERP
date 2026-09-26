-- Clear all legacy pre-seeded loom allocations so system starts with a 100% clean, blank slate
UPDATE "LoomMachineMapping"
SET "loomNumbers" = ARRAY[]::INTEGER[],
    "totalLooms" = 0;

DELETE FROM "LoomChangeover";

UPDATE "TapePlantBobbinIssue"
SET "loomNumber" = NULL,
    "loomIdentifier" = NULL,
    "loomAllocations" = NULL;
