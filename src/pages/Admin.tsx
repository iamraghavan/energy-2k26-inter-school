import { useEffect, useState } from 'react'
import { CalendarPlus, LogIn, Users } from 'lucide-react'
import { Nav } from '../components/Nav'
import { QuickSchedule } from '../components/QuickSchedule'
import { AnnouncementManager } from '../components/AnnouncementManager'
import { demoMatches, teams as demoTeams } from '../data/demo'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Team } from '../types'

export function Admin(){
 const[session,setSession]=useState<any>(null),[teams,setTeams]=useState<Team[]>(Object.values(demoTeams))
 const loadTeams=()=>{if(isSupabaseConfigured)supabase.from('teams').select('*').order('name').then(({data})=>data&&setTeams(data))}
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));loadTeams()},[])
 if(isSupabaseConfigured&&!session)return <><Nav/><main className="portal centered"><div className="login-card"><LogIn/><h1>Admin access required</h1><p>Sign in through the Scorer page using an administrator account, then return here.</p><a className="primary link-button" href="/scorer">Go to sign in</a></div></main></>
 return <><Nav/><main className="portal"><div className="portal-head"><div><span className="kicker">TOURNAMENT CONTROL</span><h1>Match registration</h1><p>Register teams on the ground and schedule the match in one step.</p></div><div className="admin-stats"><span><CalendarPlus/>{demoMatches.length} fixtures</span><span><Users/>{teams.length} teams</span></div></div><section className="admin-grid"><QuickSchedule teams={teams} onCreated={loadTeams}/><aside className="workflow"><h2>Optimized workflow</h2><div><b>01</b><span><strong>Register</strong>Type or select both teams</span></div><i/><div><b>02</b><span><strong>Start</strong>Confirm teams on ground</span></div><i/><div><b>03</b><span><strong>Finish</strong>Score locks as view-only</span></div></aside></section><div className="admin-announcements"><AnnouncementManager/></div></main></>
}
