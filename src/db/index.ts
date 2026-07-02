import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import fs from 'node:fs'
import path from 'node:path'
import * as schema from './schema'

export function createDb(dbPath = process.env.DATABASE_PATH ?? 'data/app.db') {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') })
  return db
}

export type Db = ReturnType<typeof createDb>

let _db: Db | undefined
export function getDb(): Db { return (_db ??= createDb()) }
