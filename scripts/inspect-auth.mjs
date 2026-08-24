import postgres from 'postgres'

if (!process.env.EGS_MIGRATION_DB) throw new Error('EGS_MIGRATION_DB is required')
const db = postgres(process.env.EGS_MIGRATION_DB, { ssl: 'require', max: 1 })
for (const table of ['users', 'identities']) {
  const rows = await db.unsafe(`select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'auth' and table_name = '${table}'
    order by ordinal_position`)
  console.log(table, JSON.stringify(rows))
}
await db.end()
