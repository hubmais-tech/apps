import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/env'

import { schema } from './schema'

export const sql = postgres(env.DATABASE_URL)
export const database = drizzle(sql, { schema })

export type Database = typeof database
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
export type DbOrTx = Database | Transaction
