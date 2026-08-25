import postgres from 'postgres'
if(!process.env.EGS_MIGRATION_DB||!process.env.EGS_SUPABASE_URL||!process.env.EGS_SUPABASE_KEY||!process.env.EGS_LOGIN_PASSWORD)throw new Error('Verification environment is incomplete')
const headers={apikey:process.env.EGS_SUPABASE_KEY,'Content-Type':'application/json'}
const login=await fetch(`${process.env.EGS_SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers,body:JSON.stringify({email:'admin@egslive.app',password:process.env.EGS_LOGIN_PASSWORD})})
const auth=await login.json();if(!login.ok)throw new Error(JSON.stringify(auth));headers.Authorization=`Bearer ${auth.access_token}`
const rpc=async(name,body)=>{const r=await fetch(`${process.env.EGS_SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body)});return{ok:r.ok,body:await r.json()}}
const action=async(id,type,extra={})=>{const result=await rpc('apply_score_event',{p_match_id:id,p_action:{type,...extra}});if(!result.ok)throw new Error(`${type}: ${JSON.stringify(result.body)}`);return result.body}
const db=postgres(process.env.EGS_MIGRATION_DB,{ssl:'require',max:1});const ids=[]
try{
 const createMatch=async suffix=>{const created=await rpc('create_scheduled_match',{p_sport:'cricket',p_gender:'men',p_team_a:`VERIFY ${suffix} A`,p_team_b:`VERIFY ${suffix} B`,p_scheduled_at:new Date().toISOString(),p_venue:'Verification Pitch'});if(!created.ok)throw new Error(JSON.stringify(created.body));ids.push(created.body);return created.body}
 const limited=await createMatch('LIMIT');await rpc('configure_cricket_match',{p_match_id:limited,p_overs:1});await action(limited,'start_match',{team:'a'})
 let state=await action(limited,'wide',{value:1});if(state.runs!==1||state.balls!==0)throw new Error('Wide incorrectly counted as a legal ball')
 state=await action(limited,'no_ball',{value:1});if(state.runs!==2||state.balls!==0)throw new Error('No-ball incorrectly counted as a legal ball')
 state=await action(limited,'undo');if(state.runs!==1||state.balls!==0)throw new Error('Undo did not restore the previous cricket state')
 for(let i=0;i<6;i++)state=await action(limited,'runs',{value:1});if(state.innings!==2||state.target!==8||state.battingTeam!=='b')throw new Error(`Configured-over rotation failed: ${JSON.stringify(state)}`)
 await action(limited,'runs',{value:6});await action(limited,'runs',{value:2})
 let [finished]=await db`select status,result_summary from matches where id=${limited}`;if(finished.status!=='completed'||!finished.result_summary?.includes('wickets'))throw new Error('Wicket-margin chase result failed')
 const allout=await createMatch('ALLOUT');await rpc('configure_cricket_match',{p_match_id:allout,p_overs:10});await action(allout,'start_match',{team:'b'});await action(allout,'runs',{value:4})
 for(let i=0;i<10;i++)state=await action(allout,'wicket');if(state.innings!==2||state.battingTeam!=='a'||state.target!==5)throw new Error('All-out did not rotate batting teams')
 for(let i=0;i<10;i++)state=await action(allout,'wicket');[finished]=await db`select status,result_summary from matches where id=${allout}`;if(finished.status!=='completed'||!finished.result_summary?.includes('runs'))throw new Error('All-out run-margin result failed')
 const tied=await createMatch('TIE');await rpc('configure_cricket_match',{p_match_id:tied,p_overs:5});await action(tied,'start_match',{team:'a'});await action(tied,'end_innings');await action(tied,'finish');[finished]=await db`select status,result_summary from matches where id=${tied}`;if(finished.result_summary!=='Match tied')throw new Error('Tie calculation failed')
 const locked=await rpc('apply_score_event',{p_match_id:tied,p_action:{type:'runs',value:1}});if(locked.ok)throw new Error('Completed cricket match accepted another ball')
 console.log('Verified: toss, extras, legal balls, undo, over limit, all-out, rotation, chase, run/wicket results, tie, and lock')
}finally{for(const id of ids)await db`delete from matches where id=${id}`;await db`delete from teams where name like 'VERIFY %'`;await db.end()}
