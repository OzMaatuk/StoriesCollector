import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('[Prisma] DATABASE_URL is not set');
}

const isSupabase = databaseUrl.includes('supabase.com') || databaseUrl.includes('pooler.supabase');
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isSupabase || databaseUrl.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (!globalForPrisma.prisma) {
  console.log('[Prisma] New PrismaClient instance created');
} else {
  console.log('[Prisma] Reusing existing PrismaClient instance');
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
