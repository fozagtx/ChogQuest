import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/lib/env"
import * as schema from "@/lib/db/schema"

function create() {
  return drizzle({ client: postgres(env.databaseUrl, { max: 10 }), schema })
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
