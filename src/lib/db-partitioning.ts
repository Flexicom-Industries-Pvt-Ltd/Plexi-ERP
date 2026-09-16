/**
 * PostgreSQL Time-Series Partitioning Utility for Plexi-ERP
 *
 * Provides declarative range partitioning DDL generation and maintenance helpers
 * for high-frequency write tables (audit_logs, inventory_transactions).
 */

export interface PartitionDefinition {
  tableName: string;
  partitionName: string;
  startDate: string; // ISO String (e.g. "2026-09-01 00:00:00")
  endDate: string; // ISO String (e.g. "2026-10-01 00:00:00")
  year: number;
  month: number;
}

/**
 * Format month number with leading zero (e.g. 9 -> "09")
 */
function pad(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Generate DDL for a single monthly partition
 */
export function generateMonthlyPartitionDDL(
  parentTable: string,
  year: number,
  month: number // 1 to 12
): { partitionName: string; sql: string; definition: PartitionDefinition } {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const partitionName = `${parentTable}_y${year}m${pad(month)}`;
  const startDate = `${year}-${pad(month)}-01 00:00:00`;
  const endDate = `${nextYear}-${pad(nextMonth)}-01 00:00:00`;

  const sql = `CREATE TABLE IF NOT EXISTS "${partitionName}" PARTITION OF "${parentTable}" FOR VALUES FROM ('${startDate}') TO ('${endDate}');`;

  return {
    partitionName,
    sql,
    definition: {
      tableName: parentTable,
      partitionName,
      startDate,
      endDate,
      year,
      month,
    },
  };
}

/**
 * Generate partition definitions for the current month and upcoming N months
 */
export function getUpcomingPartitions(
  parentTable: string,
  monthsAhead = 6,
  baseDate = new Date()
): Array<{ partitionName: string; sql: string; definition: PartitionDefinition }> {
  const partitions: Array<{
    partitionName: string;
    sql: string;
    definition: PartitionDefinition;
  }> = [];

  let currentYear = baseDate.getFullYear();
  let currentMonth = baseDate.getMonth() + 1; // 1-indexed

  for (let i = 0; i <= monthsAhead; i++) {
    partitions.push(generateMonthlyPartitionDDL(parentTable, currentYear, currentMonth));

    currentMonth += 1;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
  }

  return partitions;
}

/**
 * Generate full SQL migration script to enable declarative partitioning
 * for high-write ERP tables.
 */
export function generatePartitionSetupScript(monthsAhead = 12): string {
  const tables = ["audit_logs", "inventory_transactions"];
  const scriptLines: string[] = [
    `-- ==========================================================`,
    `-- PLEXI-ERP DECLARATIVE POSTGRESQL RANGE PARTITIONING SETUP`,
    `-- Generated at: ${new Date().toISOString()}`,
    `-- ==========================================================`,
    ``,
  ];

  for (const table of tables) {
    scriptLines.push(`-- Partitions for table: ${table}`);
    const partitions = getUpcomingPartitions(table, monthsAhead);
    for (const part of partitions) {
      scriptLines.push(part.sql);
    }
    scriptLines.push(``);
  }

  return scriptLines.join("\n");
}
