import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function getConnectionString() {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) return rawUrl

  try {
    const url = new URL(rawUrl)
    const sslMode = url.searchParams.get('sslmode')
    const hasLibpqCompat = url.searchParams.has('uselibpqcompat')

    if (!hasLibpqCompat && (sslMode === 'prefer' || sslMode === 'require' || sslMode === 'verify-ca')) {
      url.searchParams.set('sslmode', 'verify-full')
      return url.toString()
    }
  } catch {
  }

  return rawUrl
}

const globalForPrisma = globalThis as typeof globalThis & {
  prismaGlobal?: PrismaClient
}

const prisma =
  globalForPrisma.prismaGlobal ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: getConnectionString() }),
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = prisma
}

export default prisma