import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Pool } from 'pg'

const databaseDir = dirname(fileURLToPath(import.meta.url))
const files = (await readdir(databaseDir)).filter(name => /^\d+.*\.sql$/.test(name)).sort()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

try {
  await client.query('begin')
  await client.query(`create table if not exists opportunity.schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`)
  for (const name of files) {
    const applied = await client.query('select 1 from opportunity.schema_migrations where name=$1', [name])
    if (applied.rowCount) continue
    await client.query(await readFile(join(databaseDir, name), 'utf8'))
    await client.query('insert into opportunity.schema_migrations(name) values($1)', [name])
    console.log(`Applied ${name}`)
  }
  await client.query('commit')
} catch (error) {
  await client.query('rollback')
  throw error
} finally {
  client.release()
  await pool.end()
}
