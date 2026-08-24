import postgres from 'postgres'
if(!process.env.EGS_MIGRATION_DB||!process.env.EGS_SUPABASE_URL||!process.env.EGS_SUPABASE_KEY||!process.env.EGS_LOGIN_PASSWORD)throw new Error('Verification environment is incomplete')
const headers={apikey:process.env.EGS_SUPABASE_KEY,'Content-Type':'application/json'}
const login=await fetch(`${process.env.EGS_SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers,body:JSON.stringify({email:'admin@egslive.app',password:process.env.EGS_LOGIN_PASSWORD})})
const auth=await login.json();if(!login.ok)throw new Error(JSON.stringify(auth));headers.Authorization=`Bearer ${auth.access_token}`
const rpc=async(name,body)=>{const r=await fetch(`${process.env.EGS_SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body)});return{ok:r.ok,body:await r.json()}}
let matchId
const db=postgres(process.env.EGS_MIGRATION_DB,{ssl:'require',max:1})
try{
 const created=await rpc('create_scheduled_match',{p_sport:'football',p_gender:'mixed',p_team_a:'FLOW TEST A',p_team_b:'FLOW TEST B',p_scheduled_at:new Date().toISOString(),p_venue:'Test Ground'})
 if(!created.ok)throw new Error(JSON.stringify(created.body));matchId=created.body
 if(!(await rpc('apply_score_event',{p_match_id:matchId,p_action:{type:'start_match'}})).ok)throw new Error('Start failed')
 if(!(await rpc('apply_score_event',{p_match_id:matchId,p_action:{type:'finish'}})).ok)throw new Error('Finish failed')
 const locked=await rpc('apply_score_event',{p_match_id:matchId,p_action:{type:'score',team:'a',value:1}})
 if(locked.ok)throw new Error('Completed match incorrectly accepted a score')
 console.log('Lifecycle verified: completed match rejected further scoring')
}finally{
 if(matchId)await db`delete from public.matches where id=${matchId}`
 await db`delete from public.teams where name in ('FLOW TEST A','FLOW TEST B')`
 await db.end()
}
