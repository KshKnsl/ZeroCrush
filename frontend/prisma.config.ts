import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'
config({ path: path.join(__dirname, '.env') })

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
