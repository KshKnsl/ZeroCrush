import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as typeof globalThis & {
  prismaGlobal?: PrismaClient
}
const connectionString = process.env.DATABASE_URL
const prisma =
  globalForPrisma.prismaGlobal ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }) })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = prisma
}

export default prisma