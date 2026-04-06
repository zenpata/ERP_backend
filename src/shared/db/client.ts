import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env['DATABASE_URL']
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

// singleton connection
const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  // PostgreSQL 16+ with UTF-8 / th_TH collation
  connection: {
    TimeZone: 'Asia/Bangkok',
  },
})

export const db = drizzle(sql)

export type Database = typeof db
