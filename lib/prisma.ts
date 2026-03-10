// Product Code Sync Fix - Forced Reload
import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || 'file:./dev.db',
    syncUrl: process.env.DATABASE_SYNC_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
})

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
