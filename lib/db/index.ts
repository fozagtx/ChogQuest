import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/lib/env"
import * as schema from "@/lib/db/schema"

function create() {
  // DATABASE_URL is Neon's pooled endpoint (PgBouncer, transaction mode), so
  // prepared statements are off. Migrations use DATABASE_URL_UNPOOLED instead.
  return drizzle({ client: postgres(env.databaseUrl, { max: 10, prepare: false }), schema })
}

export type Db = ReturnType<typeof create>
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]

const globalForDb = globalThis as unknown as { questDb?: Db }

// Lazy so builds and imports never need DATABASE_URL.
export function getDb(): Db {
  globalForDb.questDb ??= create()
  return globalForDb.questDb
}

export { schema }
