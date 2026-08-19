import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
// We will import the client directly from the generated folder as specified in schema.prisma
import { PrismaClient } from '../generated/prisma';
import ws from 'ws';
import { env } from '../env';

// Required for Node.js edge environments / serverless functions
neonConfig.webSocketConstructor = ws;

// Strip query params (like ?sslmode=require) as they cause Neon Pool to fail in the local runtime
const connectionString = env.DATABASE_URL.split('?')[0];

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Singleton pattern to prevent multiple database connections during Next.js hot-reloads
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
