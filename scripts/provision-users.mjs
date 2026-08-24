import postgres from 'postgres'

if (!process.env.EGS_MIGRATION_DB) throw new Error('EGS_MIGRATION_DB is required')
const password = process.env.EGS_USER_PASSWORD
if (!password) throw new Error('EGS_USER_PASSWORD is required')
const db = postgres(process.env.EGS_MIGRATION_DB, { ssl: 'require', max: 1 })
const accounts = [
  ['admin@egslive.app', 'Tournament Administrator', 'admin', null],
  ['football.scorer@egslive.app', 'Football Scorer', 'scorer', 'football'],
  ['badminton.scorer@egslive.app', 'Badminton Scorer', 'scorer', 'badminton'],
  ['volleyball.scorer@egslive.app', 'Volleyball Scorer', 'scorer', 'volleyball'],
  ['basketball.scorer@egslive.app', 'Basketball Scorer', 'scorer', 'basketball'],
  ['cricket.scorer@egslive.app', 'Cricket Scorer', 'scorer', 'cricket'],
  ['tabletennis.scorer@egslive.app', 'Table Tennis Scorer', 'scorer', 'table_tennis'],
  ['chess.scorer@egslive.app', 'Chess Scorer', 'scorer', 'chess']
]

await db.begin(async sql => {
  for (const [email, name, role, sport] of accounts) {
    let [user] = await sql`select id from auth.users where email = ${email}`
    if (!user) {
      const id = crypto.randomUUID()
      ;[user] = await sql`insert into auth.users (
        instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
        confirmation_token,recovery_token,email_change_token_new,email_change,
        raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous
      ) values (
        '00000000-0000-0000-0000-000000000000',${id},'authenticated','authenticated',${email},crypt(${password},gen_salt('bf')),now(),
        '','','','',${{provider:'email',providers:['email']}}::jsonb,${{full_name:name}}::jsonb,now(),now(),false,false
      ) returning id`
      await sql`insert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
        values(${email},${user.id},${{sub:user.id,email,email_verified:true}}::jsonb,'email',now(),now(),now())`
    } else {
      await sql`update auth.users set encrypted_password=crypt(${password},gen_salt('bf')),email_confirmed_at=now(),updated_at=now() where id=${user.id}`
    }
    await sql`insert into public.profiles(id,full_name,role) values(${user.id},${name},${role})
      on conflict(id) do update set full_name=excluded.full_name,role=excluded.role`
    if (sport) await sql`update public.matches set scorer_id=${user.id} where sport=${sport}`
  }
})
console.log(`Provisioned ${accounts.length} confirmed users`)
for (const [email,,role] of accounts) console.log(`${role}: ${email}`)
await db.end()
