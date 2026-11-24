import 'dotenv/config';
import { db } from "../src/lib/db";

async function main() {
  const start = Date.now();
  const userCount = await db.user.count();
  const ping = Date.now() - start;
  console.log(`Database connected successfully via Prisma Adapter in ${ping}ms`);
  console.log(`Total registered users: ${userCount}`);

  try {
    const dbSize = await db.$queryRawUnsafe<Array<{ size: string }>>(
      'SELECT pg_size_pretty(pg_database_size(current_database())) as size'
    );
    console.log('Database total size:', dbSize[0]?.size);

    const tables = await db.$queryRawUnsafe<Array<any>>(`
      SELECT relname::text as table_name,
             pg_size_pretty(pg_total_relation_size(relid)) as total_size,
             pg_size_pretty(pg_relation_size(relid)) as table_size,
             pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size,
             n_live_tup::int as live_rows,
             n_dead_tup::int as dead_rows
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 25;
    `);
    console.log('\n--- TOP 25 TABLES BY DISK CONSUMPTION ---');
    console.table(tables);

    // Check index hit ratio
    const indexHitRatio = await db.$queryRawUnsafe<Array<any>>(`
      SELECT 
        (sum(idx_blks_hit) - sum(idx_blks_read))::numeric AS idx_hits,
        round(100.0 * sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0), 2)::text AS idx_hit_ratio
      FROM pg_statio_user_tables;
    `);
    console.log('\n--- CACHE & INDEX HIT RATIO ---');
    console.table(indexHitRatio);

    // Check sequential scans vs index scans
    const scanStats = await db.$queryRawUnsafe<Array<any>>(`
      SELECT relname::text as table_name,
             seq_scan::int as seq_scan,
             seq_tup_read::int as seq_tup_read,
             idx_scan::int as idx_scan,
             idx_tup_fetch::int as idx_tup_fetch
      FROM pg_stat_user_tables
      WHERE seq_scan > 0
      ORDER BY seq_tup_read DESC
      LIMIT 15;
    `);
    console.log('\n--- TOP TABLES REQUIRING INDEXES (HIGH SEQ_SCAN TUPLES) ---');
    console.table(scanStats);
  } catch (err: any) {
    console.warn('Storage analysis error:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
