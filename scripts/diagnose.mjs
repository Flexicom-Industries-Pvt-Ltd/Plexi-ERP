import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('=== User table columns ===');
  const userCols = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'User' 
    ORDER BY ordinal_position
  `);
  console.table(userCols.rows);

  console.log('\n=== Role table columns ===');
  const roleCols = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'Role' 
    ORDER BY ordinal_position
  `);
  console.table(roleCols.rows);

  console.log('\n=== RolePermission table columns ===');
  const rpCols = await pool.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'RolePermission' 
    ORDER BY ordinal_position
  `);
  console.table(rpCols.rows);

  console.log('\n=== All tables ===');
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.table(tables.rows);

  console.log('\n=== Existing users ===');
  const users = await pool.query(`SELECT id, email, "roleId" FROM "User" LIMIT 5`);
  console.table(users.rows);

  console.log('\n=== Existing roles ===');
  const roles = await pool.query(`SELECT * FROM "Role"`);
  console.table(roles.rows);

  await pool.end();
}

main().catch(console.error);
