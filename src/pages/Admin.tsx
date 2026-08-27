import { useEffect, useState } from 'react'
import { CalendarPlus, LogIn, Trash2, Users } from 'lucide-react'
import { Nav } from '../components/Nav'
import { QuickSchedule } from '../components/QuickSchedule'
import { AnnouncementManager } from '../components/AnnouncementManager'
import { useMatches } from '../hooks/useMatches'
import { demoMatches, teams as demoTeams } from '../data/demo'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Team } from '../types'
import { sportName } from '../utils'

export function Admin(){
 const { matches, setMatches, refresh, demo } = useMatches()
 const [session,setSession]=useState<any>(null),[teams,setTeams]=useState<Team[]>(Object.values(demoTeams)), [busy,setBusy]=useState(false)
 const loadTeams=()=>{if(isSupabaseConfigured)supabase.from('teams').select('*').order('name').then(({data})=>data&&setTeams(data))}
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));loadTeams()},[])
 
 const completedMatches = matches.filter(m => m.status === 'completed').sort((a,b) => +new Date(b.updated_at) - +new Date(a.updated_at))

 const deleteMatch = async (matchId: string) => {
   if (!window.confirm('Are you sure you want to delete this completed match? This action cannot be undone.')) return
   setBusy(true)
   if (demo) {
     setMatches(prev => prev.filter(m => m.id !== matchId))
     setBusy(false)
     return
   }
   const { error } = await supabase.from('matches').delete().eq('id', matchId)
   if (error) {
     alert(error.message)
   } else {
     await refresh()
   }
   setBusy(false)
 }

 if(isSupabaseConfigured&&!session)return <><Nav/><main className="portal centered"><div className="login-card"><LogIn/><h1>Admin access required</h1><p>Sign in through the Scorer page using an administrator account, then return here.</p><a className="primary link-button" href="/scorer">Go to sign in</a></div></main></>
 return <><Nav/><main className="portal"><div className="portal-head"><div><span className="kicker">TOURNAMENT CONTROL</span><h1>Match registration</h1><p>Register teams on the ground and schedule the match in one step.</p></div><div className="admin-stats"><span><CalendarPlus/>{matches.length} fixtures</span><span><Users/>{teams.length} teams</span></div></div><section className="admin-grid"><QuickSchedule teams={teams} onCreated={() => { loadTeams(); refresh(); }}/><aside className="workflow"><h2>Optimized workflow</h2><div><b>01</b><span><strong>Register</strong>Type or select both teams</span></div><i/><div><b>02</b><span><strong>Start</strong>Confirm teams on ground</span></div><i/><div><b>03</b><span><strong>Finish</strong>Score locks as view-only</span></div></aside></section><section className="admin-announcements"><div className="announcement-admin"><h2>Completed Matches ({completedMatches.length})</h2><p style={{color:'#789087',marginBottom:14}}>Manage finished fixtures. Deleting a match removes it permanently from live boards.</p><div className="announcement-list">{completedMatches.length ? completedMatches.map(m => <article key={m.id} style={{gridTemplateColumns:'1fr auto'}}><p><b>{sportName(m.sport)}</b> ({m.gender}) — <span>{m.team_a.short_name} vs {m.team_b.short_name}</span> <small style={{color:'#888',marginLeft:8}}>{m.venue}</small></p><div><button className="delete" title="Delete match" onClick={() => deleteMatch(m.id)} disabled={busy}><Trash2 size={16}/></button></div></article>) : <p className="quiet">No completed matches yet.</p>}</div></div></section><div className="admin-announcements"><AnnouncementManager/></div></main></>
}
