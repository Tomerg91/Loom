/**
 * @fileoverview Prisma client singleton used across the Action Items & Homework
 * task domain. Next.js will hot-reload modules in development, so the client is
 * memoized on the global scope to prevent exhausting the PostgreSQL connection
 * pool. The singleton is exported for reuse within services and API handlers.
 */
import { PrismaClient } from '@prisma/client';

/**
 * Declare the global caching property type so TypeScript understands that the
 * Prisma client may be memoized on the Node.js global scope during development.
 */
declare global {
   
  var __PRISMA_CLIENT__: PrismaClient | undefined;
}

const prismaClient = globalThis.__PRISMA_CLIENT__ ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__PRISMA_CLIENT__ = prismaClient;
}

export const prisma = prismaClient;
export type PrismaClientType = PrismaClient;

export default prisma;
