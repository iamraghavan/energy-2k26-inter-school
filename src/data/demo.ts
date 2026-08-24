import type { Match, Team } from '../types'

const t = (id: string, name: string, short_name: string, color: string): Team => ({ id, name, short_name, color })
export const teams = {
  cse: t('cse', 'Computer Science', 'CSE', '#18c77b'), ece: t('ece', 'Electronics', 'ECE', '#f1a227'),
  mech: t('mech', 'Mechanical', 'MECH', '#4da6ff'), eee: t('eee', 'Electrical', 'EEE', '#ef5b66'),
  it: t('it', 'Information Technology', 'IT', '#a77bf3')
}
const now = Date.now()
export const demoMatches: Match[] = [
  { id:'football-live', sport:'football', gender:'men', team_a:teams.cse, team_b:teams.ece, scheduled_at:new Date(now-3600000).toISOString(), venue:'Main Ground', status:'live', score_state:{teamA:2,teamB:1,period:'SECOND HALF',elapsed_seconds:3138,timer_status:'paused'}, featured:true, updated_at:new Date().toISOString() },
  { id:'badminton-live', sport:'badminton', gender:'men', team_a:{...teams.cse,name:'Arun',short_name:'ARUN'}, team_b:{...teams.ece,name:'Karthik',short_name:'KARTHIK'}, scheduled_at:new Date(now-1800000).toISOString(), venue:'Court 1', status:'live', score_state:{setsA:1,setsB:1,pointsA:15,pointsB:12,currentSet:3}, featured:false, updated_at:new Date().toISOString() },
  { id:'volleyball-live', sport:'volleyball', gender:'women', team_a:teams.cse, team_b:teams.eee, scheduled_at:new Date(now-900000).toISOString(), venue:'Court 2', status:'live', score_state:{setsA:2,setsB:1,pointsA:20,pointsB:17,currentSet:4}, featured:false, updated_at:new Date().toISOString() },
  { id:'basketball-next', sport:'basketball', gender:'men', team_a:teams.cse, team_b:teams.mech, scheduled_at:new Date(now+18*60000).toISOString(), venue:'Indoor Court', status:'scheduled', score_state:{teamA:0,teamB:0,period:'Q1'}, featured:false, updated_at:new Date().toISOString() },
  { id:'tt-next', sport:'table_tennis', gender:'women', team_a:teams.ece, team_b:teams.it, scheduled_at:new Date(now+38*60000).toISOString(), venue:'Hall A', status:'scheduled', score_state:{setsA:0,setsB:0,pointsA:0,pointsB:0}, featured:false, updated_at:new Date().toISOString() },
  { id:'cricket-result', sport:'cricket', gender:'men', team_a:teams.cse, team_b:teams.eee, scheduled_at:new Date(now-7200000).toISOString(), venue:'Main Ground', status:'completed', score_state:{runs:154,wickets:4,balls:105,result:'CSE won by 6 wickets'}, result_summary:'CSE won by 6 wickets', featured:false, updated_at:new Date(now-1800000).toISOString() }
]
