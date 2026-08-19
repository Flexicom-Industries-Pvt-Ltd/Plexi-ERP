require('dotenv').config();
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('./src/generated/prisma');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

async function test() {
  try {
    const url = process.env.DATABASE_URL.split('?')[0];
    console.log("Stripped URL:", url.replace(/:[^:@]+@/, ':***@'));
    
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaNeon(pool);
    const db = new PrismaClient({ adapter });
    
    console.log("Connecting...");
    const users = await db.user.findMany({ take: 1 });
    console.log("Users fetched:", users.length);
  } catch (err) {
    console.error("PRISMA ERROR:", err);
  }
}
test();
