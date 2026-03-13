import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function normalizeConnectionString(rawUrl: string | undefined) {
  if (!rawUrl) {
    return rawUrl
  }

  try {
    const parsedUrl = new URL(rawUrl)
    const sslMode = parsedUrl.searchParams.get('sslmode')
    const useLibpqCompat = parsedUrl.searchParams.get('uselibpqcompat')

    // Keep current secure behavior explicit and silence pg-connection-string warning.
    if (!useLibpqCompat && (sslMode === 'prefer' || sslMode === 'require' || sslMode === 'verify-ca')) {
      parsedUrl.searchParams.set('sslmode', 'verify-full')
      return parsedUrl.toString()
    }
  } catch {
    return rawUrl
  }

  return rawUrl
}

const prismaClientSingleton = () => {
  const connectionString = normalizeConnectionString(process.env.DATABASE_URL)
  const adapter = new PrismaPg({ 
    connectionString
  })
  return new PrismaClient({ adapter })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma