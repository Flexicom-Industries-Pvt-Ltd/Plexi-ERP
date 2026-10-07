import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { PrismaClient } from '../generated/prisma';
import { env } from '../env';

// Required for Neon to use WebSockets in Node.js and support interactive transactions
neonConfig.webSocketConstructor = ws;
// Enable HTTP fetch querying for pool queries to prevent WebSocket termination/timeouts on serverless (Vercel)
neonConfig.poolQueryViaFetch = true;

// Clean connection string to remove channel_binding which is unsupported over WebSocket/fetch proxies
let cleanConnectionString = env.DATABASE_URL
  ? env.DATABASE_URL.replace(/[?&]channel_binding=[^&]+/, '').replace(/\?$/, '')
  : '';

if (cleanConnectionString && !cleanConnectionString.includes('connect_timeout=')) {
  const separator = cleanConnectionString.includes('?') ? '&' : '?';
  cleanConnectionString = `${cleanConnectionString}${separator}connect_timeout=15`;
}

// Use the WebSocket Pool with connection timeout settings to handle cold-starts and transactions
const poolConfig = {
  connectionString: cleanConnectionString,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 10,
};
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
    transactionOptions: {
      maxWait: 15000, // 15 seconds to acquire a connection from the pool
      timeout: 30000, // 30 seconds transaction timeout
    },
  });

globalForPrisma.prisma = db;

