import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Neon auto-suspend: compute can refuse TCP connections for ~2-5s while waking up.
// connect_timeout doesn't help for refused connections — we need retries.
export async function withRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 1500): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isConnErr = err instanceof Error &&
        (err.message.includes("Can't reach database") || err.message.includes('connect ECONNREFUSED'))
      if (attempt < retries && isConnErr) {
        await new Promise(r => setTimeout(r, delayMs * attempt))
        continue
      }
      throw err
    }
  }
  throw new Error('unreachable')
}
