import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';
dotenv.config();

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await pool.query('SELECT id, email, name, "isActive" FROM "User" LIMIT 10');
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
