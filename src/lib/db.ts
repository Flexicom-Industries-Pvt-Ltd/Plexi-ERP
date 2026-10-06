import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { PrismaClient } from '../generated/prisma';
import { env } from '../env';

// Required for Neon to use WebSockets in Node.js / interactive transactions
neonConfig.webSocketConstructor = ws;
// Enable HTTP fetch querying for pool queries to prevent WebSocket termination/timeouts on serverless (Vercel)
neonConfig.poolQueryViaFetch = true;

// Clean connection string to remove channel_binding which is unsupported over WebSocket/fetch proxies
const cleanConnectionString = env.DATABASE_URL
  ? env.DATABASE_URL.replace(/[?&]channel_binding=[^&]+/, '').replace(/\?$/, '')
  : '';

// Use the WebSocket/Fetch Pool to support both queries and interactive transactions
const poolConfig = { connectionString: cleanConnectionString };
const adapter = new PrismaNeon(poolConfig);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Singleton pattern to prevent multiple database connections during Next.js hot-reloads and warm serverless containers
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

globalForPrisma.prisma = db;

