import postgres from 'postgres'

if (!process.env.EGS_MIGRATION_DB) throw new Error('EGS_MIGRATION_DB is required')
const db = postgres(process.env.EGS_MIGRATION_DB, { ssl: 'require', max: 1 })
const matches = await db.unsafe('select id,sport,status,venue from public.matches order by scheduled_at')
console.log(`Deleting ${matches.length} test/finished matches:`)
for (const match of matches) console.log(`${match.id} | ${match.sport} | ${match.status} | ${match.venue}`)
await db.begin(async tx => tx.unsafe('delete from public.matches'))
const [{ count }] = await db.unsafe('select count(*)::int as count from public.matches')
console.log(`Remaining matches: ${count}`)
await db.end()
