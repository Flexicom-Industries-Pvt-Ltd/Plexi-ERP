import { neon } from '@neondatabase/serverless';
import { PrismaNeonHttp } from '@prisma/adapter-neon';
// We will import the client directly from the generated folder as specified in schema.prisma
import { PrismaClient } from '../generated/prisma';
import { env } from '../env';

// Use the HTTP connection which is more stable and avoids the WebSocket connection string bug
const connectionString = env.DATABASE_URL;
const adapter = new PrismaNeonHttp(connectionString, {
  fetchOptions: { cache: 'no-store' }
});

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
