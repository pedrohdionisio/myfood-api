import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/config/env.js'
import * as schema from './schema/index.js'

export const sql = postgres(env.DATABASE_URL, {
  max: 10
})

export const db = drizzle(sql, { schema, casing: 'snake_case' })

export type Database = typeof db
