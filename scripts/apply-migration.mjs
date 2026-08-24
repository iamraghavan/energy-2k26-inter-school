import fs from 'node:fs'
import postgres from 'postgres'

if (!process.env.EGS_MIGRATION_DB) throw new Error('EGS_MIGRATION_DB is required')
const file = process.argv[2]
if (!file) throw new Error('Migration file path is required')
const db = postgres(process.env.EGS_MIGRATION_DB, { ssl: 'require', max: 1 })
await db.begin(async tx => tx.unsafe(fs.readFileSync(file, 'utf8')))
const live = await db.unsafe("select sport,status,venue from public.matches where status='live' order by scheduled_at")
console.log(`Applied ${file}; ${live.length} live matches`)
for (const match of live) console.log(`${match.sport} — ${match.venue}`)
await db.end()
