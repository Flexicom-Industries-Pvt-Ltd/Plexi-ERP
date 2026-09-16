import { describe, it, expect } from "vitest";
import {
  generateMonthlyPartitionDDL,
  getUpcomingPartitions,
  generatePartitionSetupScript,
} from "../db-partitioning";

describe("PostgreSQL Partitioning Utility", () => {
  it("should generate valid DDL for a standard month", () => {
    const res = generateMonthlyPartitionDDL("audit_logs", 2026, 9);

    expect(res.partitionName).toBe("audit_logs_y2026m09");
    expect(res.definition.startDate).toBe("2026-09-01 00:00:00");
    expect(res.definition.endDate).toBe("2026-10-01 00:00:00");
    expect(res.sql).toContain('CREATE TABLE IF NOT EXISTS "audit_logs_y2026m09"');
    expect(res.sql).toContain("FOR VALUES FROM ('2026-09-01 00:00:00') TO ('2026-10-01 00:00:00')");
  });

  it("should handle year rollover when partitioning December", () => {
    const res = generateMonthlyPartitionDDL("inventory_transactions", 2026, 12);

    expect(res.partitionName).toBe("inventory_transactions_y2026m12");
    expect(res.definition.startDate).toBe("2026-12-01 00:00:00");
    expect(res.definition.endDate).toBe("2027-01-01 00:00:00");
  });

  it("should generate multiple upcoming continuous monthly partitions", () => {
    const baseDate = new Date("2026-08-15T00:00:00Z");
    const partitions = getUpcomingPartitions("audit_logs", 3, baseDate);

    expect(partitions).toHaveLength(4);
    expect(partitions[0].partitionName).toBe("audit_logs_y2026m08");
    expect(partitions[1].partitionName).toBe("audit_logs_y2026m09");
    expect(partitions[2].partitionName).toBe("audit_logs_y2026m10");
    expect(partitions[3].partitionName).toBe("audit_logs_y2026m11");
  });

  it("should generate full declarative SQL partition setup script", () => {
    const script = generatePartitionSetupScript(3);

    expect(script).toContain("PLEXI-ERP DECLARATIVE POSTGRESQL RANGE PARTITIONING SETUP");
    expect(script).toContain("audit_logs");
    expect(script).toContain("inventory_transactions");
  });
});
