import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as hrSchema from '../../modules/hr/hr.schema'
import * as hrRelations from '../../modules/hr/hr.relations'
import * as financeRelations from '../../modules/finance/finance.relations'
import * as financeSchema from '../../modules/finance/finance.schema'
import * as pmSchema from '../../modules/pm/pm.schema'
import * as settingsSchema from '../../modules/settings/settings.schema'

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

// รวม schema ทุก module เพื่อให้ db.query API ใช้งานได้พร้อม type safety
const schema = {
  ...hrSchema,
  ...hrRelations,
  ...financeSchema,
  ...financeRelations,
  ...pmSchema,
  ...settingsSchema,
}

export const db = drizzle(sql, { schema })

export type Database = typeof db
