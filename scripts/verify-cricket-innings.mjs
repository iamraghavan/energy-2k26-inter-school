import postgres from 'postgres'
if(!process.env.EGS_MIGRATION_DB||!process.env.EGS_SUPABASE_URL||!process.env.EGS_SUPABASE_KEY||!process.env.EGS_LOGIN_PASSWORD)throw new Error('Verification environment is incomplete')
const headers={apikey:process.env.EGS_SUPABASE_KEY,'Content-Type':'application/json'}
const login=await fetch(`${process.env.EGS_SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers,body:JSON.stringify({email:'admin@egslive.app',password:process.env.EGS_LOGIN_PASSWORD})})
const auth=await login.json();if(!login.ok)throw new Error(JSON.stringify(auth));headers.Authorization=`Bearer ${auth.access_token}`
const rpc=async(name,body)=>{const r=await fetch(`${process.env.EGS_SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body)});return{ok:r.ok,body:await r.json()}}
const action=async(id,type,extra={})=>{const result=await rpc('apply_score_event',{p_match_id:id,p_action:{type,...extra}});if(!result.ok)throw new Error(`${type}: ${JSON.stringify(result.body)}`);return result.body}
const db=postgres(process.env.EGS_MIGRATION_DB,{ssl:'require',max:1});let matchId
try{
 const created=await rpc('create_scheduled_match',{p_sport:'cricket',p_gender:'men',p_team_a:'INNINGS TEST A',p_team_b:'INNINGS TEST B',p_scheduled_at:new Date().toISOString(),p_venue:'Test Pitch'});if(!created.ok)throw new Error(JSON.stringify(created.body));matchId=created.body
 await action(matchId,'start_match',{team:'a'});await action(matchId,'runs',{value:4});await action(matchId,'runs',{value:6})
 const chase=await action(matchId,'end_innings');if(chase.innings!==2||chase.battingTeam!=='b'||chase.target!==11||chase.runs!==0||chase.balls!==0)throw new Error(`Bad rotation: ${JSON.stringify(chase)}`)
 await action(matchId,'runs',{value:6});await action(matchId,'runs',{value:4});await action(matchId,'runs',{value:1})
 const [finished]=await db`select status,result_summary,score_state from matches where id=${matchId}`;if(finished.status!=='completed'||!finished.result_summary)throw new Error(`Bad finish: ${JSON.stringify(finished)}`)
 const locked=await rpc('apply_score_event',{p_match_id:matchId,p_action:{type:'runs',value:1}});if(locked.ok)throw new Error('Completed cricket match accepted another ball')
 console.log(`Cricket innings verified: ${finished.result_summary}`)
}finally{if(matchId)await db`delete from matches where id=${matchId}`;await db`delete from teams where name in ('INNINGS TEST A','INNINGS TEST B')`;await db.end()}
