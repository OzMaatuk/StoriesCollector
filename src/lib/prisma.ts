import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Debug: Log DATABASE_URL to verify connection string
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  // eslint-disable-next-line no-console
  console.log('[Prisma] DATABASE_URL is set');
  console.log('[DEBUG] DB URL:', process.env.DATABASE_URL?.slice(0, 40))
} else {
  console.error('[Prisma] DATABASE_URL is not set!');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (!globalForPrisma.prisma) {
  // eslint-disable-next-line no-console
  console.log('[Prisma] New PrismaClient instance created');
} else {
  // eslint-disable-next-line no-console
  console.log('[Prisma] Reusing existing PrismaClient instance');
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
