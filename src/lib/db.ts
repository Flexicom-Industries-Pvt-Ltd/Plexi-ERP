import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import ws from 'ws';
import { PrismaClient } from '../generated/prisma';
import { env } from '../env';

// Determine database environment: Neon Serverless vs Standard PostgreSQL (VPS / Docker) (ERP-022)
const rawUrl = env.DATABASE_URL || '';
const adapterType = process.env.DB_ADAPTER || (rawUrl.includes('neon.tech') || Boolean(process.env.VERCEL) ? 'neon' : 'pg');

let clientConfig: ConstructorParameters<typeof PrismaClient>[0] = {
  log: ['error', 'warn'],
  transactionOptions: {
    maxWait: 15000,
    timeout: 30000,
  },
};

let pgPool: Pool | undefined;

if (adapterType === 'neon') {
  neonConfig.webSocketConstructor = ws;
  neonConfig.poolQueryViaFetch = true;

  let cleanConnectionString = rawUrl
    .replace(/[?&]channel_binding=[^&]+/, '')
    .replace(/\?$/, '');

  if (cleanConnectionString && !cleanConnectionString.includes('connect_timeout=')) {
    const separator = cleanConnectionString.includes('?') ? '&' : '?';
    cleanConnectionString = `${cleanConnectionString}${separator}connect_timeout=15`;
  }

  const poolConfig = {
    connectionString: cleanConnectionString,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
  };
  clientConfig = {
    ...clientConfig,
    adapter: new PrismaNeon(poolConfig),
  };
} else if (adapterType === 'pg' && rawUrl) {
  pgPool = new Pool({
    connectionString: rawUrl,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
  });
  clientConfig = {
    ...clientConfig,
    adapter: new PrismaPg(pgPool),
  };
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Singleton pattern to prevent multiple database connections during Next.js hot-reloads and warm serverless containers
export const db = globalForPrisma.prisma ?? new PrismaClient(clientConfig);

globalForPrisma.prisma = db;

if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    if (globalForPrisma.prisma) {
      await globalForPrisma.prisma.$disconnect();
    }
    if (pgPool) {
      await pgPool.end();
    }
  });
}

